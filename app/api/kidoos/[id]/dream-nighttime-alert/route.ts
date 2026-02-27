/**
 * Route API pour l'alerte réveil nocturne (modèle Dream)
 * GET /api/kidoos/[id]/dream-nighttime-alert - Récupère l'état
 * PATCH /api/kidoos/[id]/dream-nighttime-alert - Active/désactive
 */

import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';
import { sendCommand, isPubNubConfigured } from '@/lib/pubnub';

/**
 * GET /api/kidoos/[id]/dream-nighttime-alert
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

    const enabled = kidoo.configDream?.nighttimeAlertEnabled ?? false;

    return createSuccessResponse({ nighttimeAlertEnabled: enabled });
  } catch (error) {
    console.error('Erreur récupération alerte réveil nocturne:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * PATCH /api/kidoos/[id]/dream-nighttime-alert
 */
export const PATCH = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { userId } = request;
    const { id } = await params;

    const body = await request.json();
    const { nighttimeAlertEnabled } = body;

    if (typeof nighttimeAlertEnabled !== 'boolean') {
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: 'nighttimeAlertEnabled doit être un booléen',
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

    await prisma.kidooConfigDream.upsert({
      where: { kidooId: id },
      update: { nighttimeAlertEnabled },
      create: {
        kidooId: id,
        nighttimeAlertEnabled,
      },
    });

    // Envoyer la config à l'ESP via PubNub (comme brightness)
    if (kidoo.macAddress && isPubNubConfigured()) {
      await sendCommand(kidoo.macAddress, 'set-nighttime-alert', {
        params: { enabled: nighttimeAlertEnabled },
        kidooId: id,
      });
    }

    return createSuccessResponse(
      { nighttimeAlertEnabled },
      { message: nighttimeAlertEnabled ? 'Alerte activée' : 'Alerte désactivée' }
    );
  } catch (error) {
    console.error('Erreur mise à jour alerte réveil nocturne:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
