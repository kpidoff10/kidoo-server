/**
 * Route API pour gérer la configuration de l'heure de coucher du modèle Dream
 * GET /api/kidoos/[id]/dream-bedtime - Récupère la configuration
 * PATCH /api/kidoos/[id]/dream-bedtime - Met à jour la configuration
 * POST /api/kidoos/[id]/dream-bedtime - Démarre ou arrête la routine manuellement
 */

import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';
import { sendCommand, isPubNubConfigured } from '@/lib/pubnub';
import { updateDreamBedtimeConfigSchema, hexToRgb, saturateRgbToMax } from '@/shared';

/**
 * POST /api/kidoos/[id]/dream-bedtime
 * Démarre ou arrête manuellement la routine de coucher
 */
export const POST = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { userId } = request;
    const { id } = await params;

    // Récupérer et valider le body
    const body = await request.json();
    const { action } = body;

    if (action !== 'start' && action !== 'stop') {
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: 'L\'action doit être "start" ou "stop"',
        field: 'action',
      });
    }

    // Vérifier que le Kidoo existe et appartient à l'utilisateur
    const kidoo = await prisma.kidoo.findUnique({
      where: { id },
    });

    if (!kidoo) {
      return createErrorResponse('NOT_FOUND', 404, {
        message: 'Kidoo non trouvé',
      });
    }

    if (kidoo.userId !== userId) {
      return createErrorResponse('FORBIDDEN', 403, {
        message: 'Accès non autorisé',
      });
    }

    // Vérifier que c'est un modèle Dream
    if (kidoo.model !== 'DREAM') {
      return createErrorResponse('BAD_REQUEST', 400, {
        message: 'Cette fonctionnalité est uniquement disponible pour le modèle Dream',
      });
    }

    // Vérifier que le Kidoo a une adresse MAC
    if (!kidoo.macAddress) {
      return createErrorResponse('BAD_REQUEST', 400, {
        message: 'Kidoo non configuré (adresse MAC manquante)',
      });
    }

    // Vérifier PubNub
    if (!isPubNubConfigured()) {
      return createErrorResponse('SERVICE_UNAVAILABLE', 503, {
        message: 'Service PubNub non configuré',
      });
    }

    // Envoyer la commande appropriée
    const command = action === 'start' ? 'start-bedtime' : 'stop-bedtime';
    const sent = await sendCommand(kidoo.macAddress, command);
    
    if (!sent) {
      return createErrorResponse('INTERNAL_ERROR', 500, {
        message: `Échec de l'envoi de la commande ${action}`,
      });
    }

    return createSuccessResponse(
      { action },
      { message: action === 'start' ? 'Routine démarrée' : 'Routine arrêtée' }
    );
  } catch (error) {
    console.error('Erreur lors du contrôle de la routine de coucher:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * GET /api/kidoos/[id]/dream-bedtime
 * Récupère la configuration de l'heure de coucher
 */
export const GET = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { userId } = request;
    const { id } = await params;

    // Vérifier que le Kidoo existe et appartient à l'utilisateur
    const kidoo = await prisma.kidoo.findUnique({
      where: { id },
      include: {
        configDream: {
          include: {
            bedtimeSchedules: true,
          },
        },
      },
    });

    if (!kidoo) {
      return createErrorResponse('NOT_FOUND', 404, {
        message: 'Kidoo non trouvé',
      });
    }

    if (kidoo.userId !== userId) {
      return createErrorResponse('FORBIDDEN', 403, {
        message: 'Accès non autorisé',
      });
    }

    // Vérifier que c'est un modèle Dream
    if (kidoo.model !== 'DREAM') {
      return createErrorResponse('BAD_REQUEST', 400, {
        message: 'Cette configuration est uniquement disponible pour le modèle Dream',
      });
    }

    // Si pas de configuration, retourner les valeurs par défaut (sans weekdaySchedule)
    if (!kidoo.configDream) {
      return createSuccessResponse({
        weekdaySchedule: undefined,
        colorR: 255,
        colorG: 107,
        colorB: 107,
        brightness: 50,
        nightlightAllNight: false,
        effect: null,
      });
    }

    // Récupérer le schedule par jour depuis la table
    let weekdaySchedule: Record<string, { hour: number; minute: number; activated: boolean }> | undefined;
    if (kidoo.configDream.bedtimeSchedules && kidoo.configDream.bedtimeSchedules.length > 0) {
      weekdaySchedule = {};
      kidoo.configDream.bedtimeSchedules.forEach((schedule) => {
        weekdaySchedule![schedule.weekday] = {
          hour: schedule.hour,
          minute: schedule.minute,
          activated: schedule.activated,
        };
      });
    }

    return createSuccessResponse({
      weekdaySchedule,
      colorR: kidoo.configDream.colorR ?? 255,
      colorG: kidoo.configDream.colorG ?? 107,
      colorB: kidoo.configDream.colorB ?? 107,
      brightness: kidoo.configDream.brightness ?? 50,
      nightlightAllNight: kidoo.configDream.allNight ?? false,
      effect: kidoo.configDream.effect ?? null,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * PATCH /api/kidoos/[id]/dream-bedtime
 * Met à jour la configuration de l'heure de coucher
 */
export const PATCH = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { userId } = request;
    const { id } = await params;

    // Récupérer et valider le body
    const body = await request.json();
    console.log('[DREAM-BEDTIME] Body reçu:', JSON.stringify(body, null, 2));
    const validation = updateDreamBedtimeConfigSchema.safeParse(body);

    if (!validation.success) {
      console.error('[DREAM-BEDTIME] Erreur de validation:', JSON.stringify(validation.error.issues, null, 2));
      const firstError = validation.error.issues[0];
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: firstError?.message || 'Données invalides',
        field: firstError?.path[0] as string,
        details: validation.error.issues,
      });
    }

    const { weekdaySchedule, color: colorHex, effect, brightness, nightlightAllNight } = validation.data;
    
    // Convertir la couleur hex en RGB si une couleur est fournie
    let rgb = { r: 255, g: 107, b: 107 }; // Couleur par défaut
    if (colorHex) {
      const parsedRgb = hexToRgb(colorHex);
      if (!parsedRgb) {
        return createErrorResponse('VALIDATION_ERROR', 400, {
          message: 'Couleur invalide',
          field: 'color',
        });
      }
      // Saturer la couleur à 100% pour qu'elle soit "profonde"
      rgb = saturateRgbToMax(parsedRgb);
    }

    // Vérifier que le Kidoo existe et appartient à l'utilisateur
    const kidoo = await prisma.kidoo.findUnique({
      where: { id },
    });

    if (!kidoo) {
      return createErrorResponse('NOT_FOUND', 404, {
        message: 'Kidoo non trouvé',
      });
    }

    if (kidoo.userId !== userId) {
      return createErrorResponse('FORBIDDEN', 403, {
        message: 'Accès non autorisé',
      });
    }

    // Vérifier que c'est un modèle Dream
    if (kidoo.model !== 'DREAM') {
      return createErrorResponse('BAD_REQUEST', 400, {
        message: 'Cette configuration est uniquement disponible pour le modèle Dream',
      });
    }

    // Préparer les données de mise à jour
    const updateData: {
      colorR?: number;
      colorG?: number;
      colorB?: number;
      brightness?: number;
      allNight?: boolean;
      effect?: string | null;
    } = {
      brightness,
      allNight: nightlightAllNight,
    };

    // Si une couleur est fournie, l'utiliser (pour couleur fixe)
    if (colorHex) {
      updateData.colorR = rgb.r;
      updateData.colorG = rgb.g;
      updateData.colorB = rgb.b;
      // Si on utilise une couleur, l'effet doit être null ou "none"
      updateData.effect = effect === 'none' ? null : (effect || null);
    } else if (effect) {
      // Si un effet est fourni sans couleur, garder la couleur existante ou utiliser la couleur par défaut
      // L'effet sera utilisé
      updateData.effect = effect;
    }

    // Mettre à jour ou créer la configuration
    const config = await prisma.kidooConfigDream.upsert({
      where: { kidooId: id },
      update: updateData,
      create: {
        kidooId: id,
        colorR: rgb.r,
        colorG: rgb.g,
        colorB: rgb.b,
        brightness,
        allNight: nightlightAllNight,
        effect: effect || null,
      },
      include: {
        bedtimeSchedules: true,
      },
    });

    // Mettre à jour les schedules par jour
    if (weekdaySchedule && Object.keys(weekdaySchedule).length > 0) {
      // Supprimer tous les schedules existants pour ce config
      await prisma.kidooConfigDreamBedtimeSchedule.deleteMany({
        where: { kidooConfigDreamId: config.id },
      });

      // Créer les nouveaux schedules
      await prisma.kidooConfigDreamBedtimeSchedule.createMany({
        data: Object.entries(weekdaySchedule).map(([weekday, time]) => ({
          kidooConfigDreamId: config.id,
          weekday,
          hour: time.hour,
          minute: time.minute,
          activated: time.activated ?? true,
        })),
      });
    } else {
      // Si weekdaySchedule est vide ou undefined, supprimer tous les schedules existants
      await prisma.kidooConfigDreamBedtimeSchedule.deleteMany({
        where: { kidooConfigDreamId: config.id },
      });
    }

    // Récupérer les schedules mis à jour après les modifications
    const updatedSchedules = await prisma.kidooConfigDreamBedtimeSchedule.findMany({
      where: { kidooConfigDreamId: config.id },
    });

    // Construire le schedule pour la réponse
    let responseWeekdaySchedule: Record<string, { hour: number; minute: number; activated: boolean }> | undefined;
    if (updatedSchedules.length > 0) {
      responseWeekdaySchedule = {};
      updatedSchedules.forEach((schedule) => {
        responseWeekdaySchedule![schedule.weekday] = {
          hour: schedule.hour,
          minute: schedule.minute,
          activated: schedule.activated,
        };
      });
    }

    // Récupérer la config mise à jour pour la réponse (incluant les schedules)
    const updatedConfig = await prisma.kidooConfigDream.findUnique({
      where: { id: config.id },
      include: {
        bedtimeSchedules: true,
      },
    });

    if (!updatedConfig) {
      return createErrorResponse('INTERNAL_ERROR', 500, {
        message: 'Erreur lors de la récupération de la configuration mise à jour',
      });
    }

    // Envoyer la configuration à l'ESP32 via PubNub
    if (kidoo.macAddress && isPubNubConfigured()) {
      try {
        // Construire les paramètres PubNub avec la configuration
        const params: Record<string, unknown> = {
          colorR: updatedConfig.colorR ?? rgb.r,
          colorG: updatedConfig.colorG ?? rgb.g,
          colorB: updatedConfig.colorB ?? rgb.b,
          brightness: updatedConfig.brightness,
          allNight: updatedConfig.allNight,
        };

        // Ajouter l'effet si présent
        if (updatedConfig.effect) {
          params.effect = updatedConfig.effect;
        }

        // Ajouter weekdaySchedule si présent
        if (responseWeekdaySchedule && Object.keys(responseWeekdaySchedule).length > 0) {
          params.weekdaySchedule = responseWeekdaySchedule;
        }

        // Construire le message PubNub avec la configuration
        const pubnubMessage: Record<string, unknown> = {
          action: 'set-bedtime-config',
          params,
        };

        console.log('[DREAM-BEDTIME] Envoi configuration via PubNub:', JSON.stringify(pubnubMessage, null, 2));
        await sendCommand(kidoo.macAddress, 'set-bedtime-config', pubnubMessage.params as Record<string, unknown>);
        console.log('[DREAM-BEDTIME] Configuration envoyée avec succès via PubNub');
      } catch (error) {
        console.error('[DREAM-BEDTIME] Erreur lors de l\'envoi PubNub:', error);
        // Ne pas faire échouer la requête si PubNub échoue, la config est déjà en base
      }
    } else {
      if (!kidoo.macAddress) {
        console.warn('[DREAM-BEDTIME] Adresse MAC manquante, impossible d\'envoyer via PubNub');
      }
      if (!isPubNubConfigured()) {
        console.warn('[DREAM-BEDTIME] PubNub non configuré, impossible d\'envoyer la configuration');
      }
    }

    return createSuccessResponse(
      {
        weekdaySchedule: responseWeekdaySchedule,
        colorR: updatedConfig.colorR ?? rgb.r,
        colorG: updatedConfig.colorG ?? rgb.g,
        colorB: updatedConfig.colorB ?? rgb.b,
        brightness: updatedConfig.brightness ?? 50,
        nightlightAllNight: updatedConfig.allNight ?? false,
        effect: updatedConfig.effect ?? null,
      },
      { message: 'Configuration de l\'heure de coucher mise à jour' }
    );
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la configuration:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
