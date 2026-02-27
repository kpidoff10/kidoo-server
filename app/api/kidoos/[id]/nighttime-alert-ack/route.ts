/**
 * POST /api/kidoos/[id]/nighttime-alert-ack
 * Envoie un signal "J'arrive" à la veilleuse : effet rainbow pendant 5 secondes.
 * Appelé quand le parent tape le bouton sur la notification d'alerte nocturne.
 */

import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';
import { sendCommand, isPubNubConfigured } from '@/lib/pubnub';
import { prisma } from '@/lib/prisma';

export const POST = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { userId } = request;
    const { id } = await params;

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

    if (kidoo.model !== 'dream') {
      return createErrorResponse('BAD_REQUEST', 400, {
        message: 'Cette fonctionnalité est uniquement disponible pour le modèle Dream',
      });
    }

    if (!kidoo.macAddress) {
      return createErrorResponse('BAD_REQUEST', 400, {
        message: 'Kidoo non configuré (adresse MAC manquante)',
      });
    }

    if (!isPubNubConfigured()) {
      return createErrorResponse('SERVICE_UNAVAILABLE', 503, {
        message: 'Service PubNub non configuré',
      });
    }

    const sent = await sendCommand(kidoo.macAddress, 'nighttime-alert-ack');

    if (!sent) {
      return createErrorResponse('SERVICE_UNAVAILABLE', 503, {
        message: 'Échec de l\'envoi du signal à la veilleuse',
      });
    }

    return createSuccessResponse({ sent: true });
  } catch (error) {
    console.error('[nighttime-alert-ack] Erreur:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      message: 'Erreur interne',
    });
  }
});
