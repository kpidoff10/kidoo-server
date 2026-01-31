/**
 * Route API pour gérer la luminosité générale d'un Kidoo
 * PATCH /api/kidoos/[id]/brightness - Met à jour la luminosité et envoie via PubNub
 */

import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';
import { sendCommand, isPubNubConfigured } from '@/lib/pubnub';
import { z } from 'zod';

const updateBrightnessSchema = z.object({
  brightness: z.number().min(0).max(100),
});

/**
 * PATCH /api/kidoos/[id]/brightness
 * Met à jour la luminosité et envoie la commande via PubNub
 */
export const PATCH = withAuth(async (
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

    // Vérifier que le Kidoo a une adresse MAC (nécessaire pour PubNub)
    if (!kidoo.macAddress) {
      return createErrorResponse('BAD_REQUEST', 400, {
        message: 'Le Kidoo doit avoir une adresse MAC configurée',
      });
    }

    // Parser et valider le body
    const body = await request.json();
    const validationResult = updateBrightnessSchema.safeParse(body);

    if (!validationResult.success) {
      return createErrorResponse('BAD_REQUEST', 400, {
        message: 'Données invalides',
        details: validationResult.error.issues,
      });
    }

    const { brightness } = validationResult.data;

    // Mettre à jour la luminosité dans la base de données
    // Le champ brightness est dans la table Kidoo (luminosité générale, 0-100%)
    await prisma.kidoo.update({
      where: { id },
      data: {
        brightness,
      },
    });

    // Envoyer la commande via PubNub pour mise à jour en temps réel
    if (isPubNubConfigured() && kidoo.macAddress) {
      try {
        const sent = await sendCommand(kidoo.macAddress, 'brightness', { value: brightness });
        
        if (!sent) {
          console.error('[BRIGHTNESS] Échec de l\'envoi PubNub');
          // Ne pas faire échouer la requête si PubNub échoue, la valeur est déjà en base
        } else {
          console.log('[BRIGHTNESS] Commande brightness envoyée avec succès via PubNub');
        }
      } catch (error) {
        console.error('[BRIGHTNESS] Erreur lors de l\'envoi PubNub:', error);
        // Ne pas faire échouer la requête si PubNub échoue, la valeur est déjà en base
      }
    }

    return createSuccessResponse({
      brightness,
      message: 'Luminosité mise à jour',
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la luminosité:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
