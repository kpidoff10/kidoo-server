/**
 * Route API publique pour que l'ESP32 récupère sa configuration via son adresse MAC
 * GET /api/kidoos/config/[macAddress] - Récupère les configurations bedtime et wakeup
 * 
 * Cette route est publique (sans authentification) car l'ESP32 n'a pas de token JWT.
 * L'adresse MAC sert d'identifiant unique pour retrouver le Kidoo.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';

/**
 * Normalise une adresse MAC pour la recherche
 * Enlève les séparateurs (: - .) et met en majuscules
 */
function normalizeMacAddress(mac: string): string {
  return mac.replace(/[:.\-]/g, '').toUpperCase();
}

/**
 * GET /api/kidoos/config/[macAddress]
 * Récupère les configurations bedtime et wakeup pour l'ESP32
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ macAddress: string }> }
) {
  try {
    const { macAddress } = await params;

    if (!macAddress) {
      return createErrorResponse('BAD_REQUEST', 400, {
        message: 'Adresse MAC manquante',
      });
    }

    // Normaliser l'adresse MAC pour la recherche
    const normalizedMac = normalizeMacAddress(macAddress);

    // Trouver le Kidoo par son adresse MAC
    // On récupère tous les Kidoos et on filtre côté code pour gérer les différents formats
    const allKidoos = await prisma.kidoo.findMany({
      where: {
        macAddress: {
          not: null,
        },
      },
      include: {
        configDream: {
          include: {
            bedtimeSchedules: true,
            wakeupSchedules: true,
          },
        },
      },
    });

    // Trouver le Kidoo dont l'adresse MAC normalisée correspond
    const kidoo = allKidoos.find((k) => {
      if (!k.macAddress) return false;
      return normalizeMacAddress(k.macAddress) === normalizedMac;
    });

    if (!kidoo) {
      return createErrorResponse('NOT_FOUND', 404, {
        message: 'Kidoo non trouvé pour cette adresse MAC',
      });
    }

    // Vérifier que c'est un modèle Dream
    if (kidoo.model !== 'DREAM') {
      return createErrorResponse('BAD_REQUEST', 400, {
        message: 'Cette configuration est uniquement disponible pour le modèle Dream',
      });
    }

    // Construire la réponse avec les configurations bedtime et wakeup
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
    } = {};

    // Configuration Bedtime
    if (kidoo.configDream) {
      // Bedtime schedule
      let bedtimeWeekdaySchedule: Record<string, { hour: number; minute: number; activated: boolean }> | undefined;
      if (kidoo.configDream.bedtimeSchedules && kidoo.configDream.bedtimeSchedules.length > 0) {
        bedtimeWeekdaySchedule = {};
        kidoo.configDream.bedtimeSchedules.forEach((schedule) => {
          bedtimeWeekdaySchedule![schedule.weekday] = {
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

      // Wakeup schedule
      let wakeupWeekdaySchedule: Record<string, { hour: number; minute: number; activated: boolean }> | undefined;
      if (kidoo.configDream.wakeupSchedules && kidoo.configDream.wakeupSchedules.length > 0) {
        wakeupWeekdaySchedule = {};
        kidoo.configDream.wakeupSchedules.forEach((schedule) => {
          wakeupWeekdaySchedule![schedule.weekday] = {
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
    } else {
      // Valeurs par défaut si pas de configuration
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
    }

    return createSuccessResponse(response);
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
}
