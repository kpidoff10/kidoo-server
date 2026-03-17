/**
 * Route API pour activer le Dream (simule un tap sur le capteur)
 * POST /api/kidoos/[id]/dream-active - Envoie un tap-sensor au device
 */

import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';
import { sendCommand, isMqttConfigured } from '@/lib/mqtt';

/**
 * POST /api/kidoos/[id]/dream-active
 * Active le Dream (simule un tap sur le capteur)
 * Le device décide de la logique : si routine active → arrêter, sinon → lancer routine ou afficher couleur par défaut
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
    if (kidoo.model !== 'dream') {
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

    // Vérifier mqtt
    if (!isMqttConfigured()) {
      return createErrorResponse('SERVICE_UNAVAILABLE', 503, {
        message: 'Service MQTT non configuré',
      });
    }

    // Envoyer la commande pour simuler un tap sur le capteur
    const sent = await sendCommand(kidoo.macAddress, 'tap-sensor');

    if (!sent) {
      return createErrorResponse('INTERNAL_ERROR', 500, {
        message: 'Échec de l\'envoi de la commande d\'activation',
      });
    }

    return createSuccessResponse(
      { activated: true },
      { message: 'Dream activé' }
    );
  } catch (error) {
    console.error('Erreur lors de l\'activation du Dream:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
