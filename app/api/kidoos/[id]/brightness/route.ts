/**
 * Route API pour gérer la luminosité générale d'un Kidoo
 * PATCH /api/kidoos/[id]/brightness - Met à jour la luminosité en DB
 * La commande MQTT est envoyée directement par l'app via useKidooMutations
 */

import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';
import { z } from 'zod';

const updateBrightnessSchema = z.object({
  brightness: z.number().min(0).max(100),
});

/**
 * PATCH /api/kidoos/[id]/brightness
 * Met à jour la luminosité et envoie la commande via MQTT
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
