/**
 * Route API pour la configuration de couleur/effet par défaut (modèle Dream)
 * GET /api/kidoos/[id]/dream-default-color - Récupère la configuration
 * PATCH /api/kidoos/[id]/dream-default-color - Met à jour la configuration
 */

import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';
import { sendCommand, isPubNubConfigured } from '@/lib/pubnub';

// Valeurs par défaut
const DEFAULT_COLOR_R = 255;
const DEFAULT_COLOR_G = 0;
const DEFAULT_COLOR_B = 0;
const DEFAULT_BRIGHTNESS = 50;
const DEFAULT_EFFECT = null; // null = couleur unie

/**
 * GET /api/kidoos/[id]/dream-default-color
 */
export const GET = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { userId } = request;
    const { id } = await params;

    const kidoo = await prisma.kidoo.findUnique({
      where: { id },
      include: { configDream: true },
    });

    if (!kidoo || kidoo.userId !== userId) {
      return createErrorResponse('NOT_FOUND', 404, { message: 'Kidoo non trouvé' });
    }

    if (kidoo.model !== 'dream') {
      return createErrorResponse('BAD_REQUEST', 400, {
        message: 'Cette fonctionnalité est uniquement disponible pour le modèle Dream',
      });
    }

    const config = kidoo.configDream;
    const response = {
      colorR: config?.defaultColorR ?? DEFAULT_COLOR_R,
      colorG: config?.defaultColorG ?? DEFAULT_COLOR_G,
      colorB: config?.defaultColorB ?? DEFAULT_COLOR_B,
      brightness: config?.defaultBrightness ?? DEFAULT_BRIGHTNESS,
      effect: config?.defaultEffect ?? DEFAULT_EFFECT,
    };

    return createSuccessResponse(response);
  } catch (error) {
    console.error('Erreur récupération config couleur par défaut:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * PATCH /api/kidoos/[id]/dream-default-color
 */
export const PATCH = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { userId } = request;
    const { id } = await params;

    const body = await request.json();
    const { colorR, colorG, colorB, brightness, effect } = body;

    // Validation
    if (colorR !== undefined && (typeof colorR !== 'number' || colorR < 0 || colorR > 255)) {
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: 'colorR doit être entre 0 et 255',
      });
    }
    if (colorG !== undefined && (typeof colorG !== 'number' || colorG < 0 || colorG > 255)) {
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: 'colorG doit être entre 0 et 255',
      });
    }
    if (colorB !== undefined && (typeof colorB !== 'number' || colorB < 0 || colorB > 255)) {
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: 'colorB doit être entre 0 et 255',
      });
    }
    if (brightness !== undefined && (typeof brightness !== 'number' || brightness < 0 || brightness > 100)) {
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: 'brightness doit être entre 0 et 100',
      });
    }
    if (effect !== undefined && effect !== null && typeof effect !== 'string') {
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: 'effect doit être une chaîne ou null',
      });
    }

    const kidoo = await prisma.kidoo.findUnique({
      where: { id },
    });

    if (!kidoo || kidoo.userId !== userId) {
      return createErrorResponse('NOT_FOUND', 404, { message: 'Kidoo non trouvé' });
    }

    if (kidoo.model !== 'dream') {
      return createErrorResponse('BAD_REQUEST', 400, {
        message: 'Cette fonctionnalité est uniquement disponible pour le modèle Dream',
      });
    }

    // Mise à jour de la config
    const updateData: {
      defaultColorR?: number;
      defaultColorG?: number;
      defaultColorB?: number;
      defaultBrightness?: number;
      defaultEffect?: string | null;
    } = {};
    if (colorR !== undefined) updateData.defaultColorR = colorR;
    if (colorG !== undefined) updateData.defaultColorG = colorG;
    if (colorB !== undefined) updateData.defaultColorB = colorB;
    if (brightness !== undefined) updateData.defaultBrightness = brightness;
    if (effect !== undefined) updateData.defaultEffect = effect;

    await prisma.kidooConfigDream.upsert({
      where: { kidooId: id },
      update: updateData,
      create: {
        kidooId: id,
        ...updateData,
      },
    });

    // Envoyer la config à l'ESP via PubNub (params requis pour que l'ESP reçoive colorR, colorG, etc.)
    if (kidoo.macAddress && isPubNubConfigured()) {
      await sendCommand(kidoo.macAddress, 'set-default-config', {
        params: {
          colorR: colorR ?? DEFAULT_COLOR_R,
          colorG: colorG ?? DEFAULT_COLOR_G,
          colorB: colorB ?? DEFAULT_COLOR_B,
          brightness: brightness ?? DEFAULT_BRIGHTNESS,
          effect: effect ?? DEFAULT_EFFECT,
        },
        kidooId: id,
      });
    }

    return createSuccessResponse(
      {
        colorR: colorR ?? DEFAULT_COLOR_R,
        colorG: colorG ?? DEFAULT_COLOR_G,
        colorB: colorB ?? DEFAULT_COLOR_B,
        brightness: brightness ?? DEFAULT_BRIGHTNESS,
        effect: effect ?? DEFAULT_EFFECT,
      },
      { message: 'Configuration couleur par défaut mise à jour' }
    );
  } catch (error) {
    console.error('Erreur mise à jour config couleur par défaut:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
