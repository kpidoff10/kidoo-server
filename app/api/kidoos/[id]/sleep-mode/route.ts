/**
 * Route API pour gérer la configuration du sleep mode
 * GET /api/kidoos/[id]/sleep-mode - Récupère la configuration
 * PATCH /api/kidoos/[id]/sleep-mode - Met à jour la configuration
 */

import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';
import { sleepModeConfigSchema } from '@/shared';
import { sendCommand, isPubNubConfigured } from '@/lib/pubnub';

/**
 * GET /api/kidoos/[id]/sleep-mode
 * Récupère la configuration du sleep mode
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

    // Note: Cast nécessaire car le client Prisma doit être régénéré après l'ajout des champs sleepColor* et sleepEffect
    const kidooWithSleepMode = kidoo as typeof kidoo & {
      sleepColorR: number | null;
      sleepColorG: number | null;
      sleepColorB: number | null;
      sleepEffect: number | null;
    };

    // Si pas de configuration, retourner les valeurs par défaut (couleur noire)
    if (kidooWithSleepMode.sleepColorR === null || kidooWithSleepMode.sleepColorG === null || kidooWithSleepMode.sleepColorB === null) {
      return createSuccessResponse({
        type: 'color',
        color: {
          r: 0,
          g: 0,
          b: 0,
        },
      });
    }

    // Si un effet est configuré (sleepEffect !== null && !== 0)
    if (kidooWithSleepMode.sleepEffect !== null && kidooWithSleepMode.sleepEffect > 0) {
      return createSuccessResponse({
        type: 'effect',
        effect: kidooWithSleepMode.sleepEffect,
      });
    }

    // Sinon, couleur unie
    return createSuccessResponse({
      type: 'color',
      color: {
        r: kidooWithSleepMode.sleepColorR ?? 0,
        g: kidooWithSleepMode.sleepColorG ?? 0,
        b: kidooWithSleepMode.sleepColorB ?? 0,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * PATCH /api/kidoos/[id]/sleep-mode
 * Met à jour la configuration du sleep mode
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
    console.log('[SLEEP-MODE] Body reçu:', JSON.stringify(body, null, 2));
    const validation = sleepModeConfigSchema.safeParse(body);

    if (!validation.success) {
      console.error('[SLEEP-MODE] Erreur de validation:', JSON.stringify(validation.error.issues, null, 2));
      const firstError = validation.error.issues[0];
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: firstError?.message || 'Données invalides',
        field: firstError?.path[0] as string,
        details: validation.error.issues,
      });
    }

    const { type, color, effect } = validation.data;

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

    // Préparer les données de mise à jour
    const updateData: {
      sleepColorR?: number | null;
      sleepColorG?: number | null;
      sleepColorB?: number | null;
      sleepEffect?: number | null;
    } = {};

    if (type === 'color' && color) {
      updateData.sleepColorR = color.r;
      updateData.sleepColorG = color.g;
      updateData.sleepColorB = color.b;
      updateData.sleepEffect = 0; // LED_EFFECT_NONE
    } else if (type === 'effect' && effect !== undefined) {
      updateData.sleepColorR = null;
      updateData.sleepColorG = null;
      updateData.sleepColorB = null;
      updateData.sleepEffect = effect;
    }

    // Mettre à jour le Kidoo
    // Note: Cast nécessaire car le client Prisma doit être régénéré après l'ajout des champs sleepColor* et sleepEffect
    await prisma.kidoo.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: updateData as any,
    });

    // Envoyer la commande via PubNub si configuré
    if (isPubNubConfigured() && kidoo.macAddress) {
      try {
        // Construire les paramètres de la commande pour l'ESP32
        const params: Record<string, unknown> = {};

        if (type === 'color' && color) {
          params.colorR = color.r;
          params.colorG = color.g;
          params.colorB = color.b;
          params.effect = 0; // LED_EFFECT_NONE
        } else if (type === 'effect' && effect !== undefined) {
          params.colorR = 0;
          params.colorG = 0;
          params.colorB = 0;
          params.effect = effect;
        }

        await sendCommand(kidoo.macAddress, 'sleep-mode-config', params);
        console.log('[SLEEP-MODE] Commande envoyée via PubNub:', JSON.stringify({ action: 'sleep-mode-config', ...params }, null, 2));
      } catch (pubnubError) {
        console.error('[SLEEP-MODE] Erreur lors de l\'envoi de la commande PubNub:', pubnubError);
        // Ne pas échouer la requête si PubNub échoue, la config est quand même sauvegardée
      }
    }

    // Construire la réponse
    const response: {
      type: 'color' | 'effect';
      color?: { r: number; g: number; b: number };
      effect?: number;
    } = {
      type,
    };

    if (type === 'color' && color) {
      response.color = color;
    } else if (type === 'effect' && effect !== undefined) {
      response.effect = effect;
    }

    return createSuccessResponse(response);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la configuration:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
