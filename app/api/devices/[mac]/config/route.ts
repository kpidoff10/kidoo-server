/**
 * GET /api/devices/[mac]/config
 * Route pour que l'ESP32 récupère sa configuration via son adresse MAC.
 * Récupère les configurations bedtime et wakeup.
 *
 * Protégé par signature Ed25519 si le Kidoo a une publicKey.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';
import { withDeviceAuth } from '@/lib/withDeviceAuth';
import { deriveDeviceSecret, toBase64url } from '@/lib/cmd-jwt';

function normalizeMacAddress(mac: string): string {
  return mac.replace(/[:.\-]/g, '').toUpperCase();
}

export const GET = withDeviceAuth(async (request, { params }) => {
  try {
    const { mac } = await params;

    if (!mac) {
      return createErrorResponse('BAD_REQUEST', 400, {
        message: 'Adresse MAC manquante',
      });
    }

    const normalizedMac = normalizeMacAddress(mac);

    const allKidoos = await prisma.kidoo.findMany({
      where: { macAddress: { not: null } },
      include: {
        user: {
          select: { timezoneId: true },
        },
        configDream: {
          include: {
            bedtimeSchedules: true,
            wakeupSchedules: true,
          },
        },
      },
    });

    const kidoo = allKidoos.find((k) => {
      if (!k.macAddress) return false;
      return normalizeMacAddress(k.macAddress) === normalizedMac;
    });

    if (!kidoo) {
      return createErrorResponse('NOT_FOUND', 404, {
        message: 'Kidoo non trouvé pour cette adresse MAC',
      });
    }

    // Note: Cet endpoint est maintenant générique pour tous les modèles
    // (cmdTokenSecret est commun à Dream, Sound, Gotchi)
    // Seuls les configs spécifiques au modèle (bedtime, wakeup) sont omises pour non-Dream

    const response: {
      bedtime?: {
        weekdaySchedule?: Record<string, { hour: number; minute: number; activated: boolean }>;
        colorR: number;
        colorG: number;
        colorB: number;
        brightness: number;
        nightlightAllNight: boolean;
      };
      wakeup?: {
        weekdaySchedule?: Record<string, { hour: number; minute: number; activated: boolean }>;
        colorR: number;
        colorG: number;
        colorB: number;
        brightness: number;
      };
      defaultColor?: {
        colorR: number;
        colorG: number;
        colorB: number;
        brightness: number;
        effect: string;
      } | null;
      nighttimeAlertEnabled?: boolean;
      timezoneId?: string;
      cmdTokenSecret?: string;
    } = {};

    // Configuration spécifique au modèle Dream
    const isDream = kidoo.model === 'dream';

    // Inclure les configs spécifiques à Dream uniquement pour les devices Dream
    if (isDream) {
      if (kidoo.configDream) {
        let bedtimeWeekdaySchedule: Record<string, { hour: number; minute: number; activated: boolean }> | undefined;
        if (kidoo.configDream.bedtimeSchedules && kidoo.configDream.bedtimeSchedules.length > 0) {
          bedtimeWeekdaySchedule = {};
          kidoo.configDream.bedtimeSchedules.forEach((schedule) => {
            bedtimeWeekdaySchedule![schedule.weekday.toLowerCase()] = {
              hour: schedule.hour,
              minute: schedule.minute,
              activated: schedule.activated,
            };
          });
        }

        response.bedtime = {
          weekdaySchedule: bedtimeWeekdaySchedule,
          colorR: kidoo.configDream.colorR ?? 255,
          colorG: kidoo.configDream.colorG ?? 107,
          colorB: kidoo.configDream.colorB ?? 107,
          brightness: kidoo.configDream.brightness ?? 50,
          nightlightAllNight: kidoo.configDream.allNight ?? false,
        };

        let wakeupWeekdaySchedule: Record<string, { hour: number; minute: number; activated: boolean }> | undefined;
        if (kidoo.configDream.wakeupSchedules && kidoo.configDream.wakeupSchedules.length > 0) {
          wakeupWeekdaySchedule = {};
          kidoo.configDream.wakeupSchedules.forEach((schedule) => {
            wakeupWeekdaySchedule![schedule.weekday.toLowerCase()] = {
              hour: schedule.hour,
              minute: schedule.minute,
              activated: schedule.activated,
            };
          });
        }

        response.wakeup = {
          weekdaySchedule: wakeupWeekdaySchedule,
          colorR: kidoo.configDream.wakeupColorR ?? 255,
          colorG: kidoo.configDream.wakeupColorG ?? 200,
          colorB: kidoo.configDream.wakeupColorB ?? 100,
          brightness: kidoo.configDream.wakeupBrightness ?? 50,
        };

        response.defaultColor = kidoo.configDream.defaultColorR != null ? {
          colorR: kidoo.configDream.defaultColorR,
          colorG: kidoo.configDream.defaultColorG ?? 255,
          colorB: kidoo.configDream.defaultColorB ?? 255,
          brightness: kidoo.configDream.defaultBrightness ?? 50,
          effect: kidoo.configDream.defaultEffect ?? 'static',
        } : null;

        response.nighttimeAlertEnabled = kidoo.configDream.nighttimeAlertEnabled ?? false;
      } else {
        // Dream sans config: retourner valeurs par défaut
        response.bedtime = {
          weekdaySchedule: undefined,
          colorR: 255,
          colorG: 107,
          colorB: 107,
          brightness: 50,
          nightlightAllNight: false,
        };

        response.wakeup = {
          weekdaySchedule: undefined,
          colorR: 255,
          colorG: 200,
          colorB: 100,
          brightness: 50,
        };

        response.defaultColor = null;
        response.nighttimeAlertEnabled = false;
      }
    }
    // Pour Sound/Gotchi: ne pas inclure les champs bedtime/wakeup/defaultColor/nighttimeAlertEnabled

    // Ajouter le timezone du profil utilisateur
    if (kidoo.user?.timezoneId) {
      response.timezoneId = kidoo.user.timezoneId;
    }

    // Ajouter le secret dérivé pour vérifier les tokens de commande MQTT (unique par device, en base64url)
    response.cmdTokenSecret = toBase64url(deriveDeviceSecret(normalizedMac));

    return createSuccessResponse(response);
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
