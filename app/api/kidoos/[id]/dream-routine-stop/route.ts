/**
 * Route API pour arrêter la routine active (bedtime ou wakeup) du modèle Dream
 * POST /api/kidoos/[id]/dream-routine-stop - Arrête la routine active
 */

import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';
import { sendCommand, isPubNubConfigured } from '@/lib/pubnub';

/**
 * POST /api/kidoos/[id]/dream-routine-stop
 * Arrête la routine active (bedtime ou wakeup)
 */
export const POST = withAuth(async (
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

    // Envoyer la commande pour arrêter la routine active
    const sent = await sendCommand(kidoo.macAddress, 'stop-routine');
    
    if (!sent) {
      return createErrorResponse('INTERNAL_ERROR', 500, {
        message: 'Échec de l\'envoi de la commande d\'arrêt',
      });
    }

    return createSuccessResponse(
      { stopped: true },
      { message: 'Routine arrêtée' }
    );
  } catch (error) {
    console.error('Erreur lors de l\'arrêt de la routine:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
