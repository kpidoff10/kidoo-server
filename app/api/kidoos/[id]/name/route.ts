/**
 * Route API pour modifier le nom d'un Kidoo
 * PATCH /api/kidoos/[id]/name
 * 
 * Body: { "name": "Nouveau nom" }
 */

import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { updateKidooNameSchema } from '@/shared';
import { KidooErrors } from '../errors';

/**
 * PATCH /api/kidoos/[id]/name
 * Modifie le nom d'un Kidoo
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
    const validation = updateKidooNameSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return createErrorResponse(KidooErrors.VALIDATION_ERROR, {
        message: firstError?.message || 'Données invalides',
        field: firstError?.path[0] as string,
        details: validation.error.issues,
      });
    }

    const { name } = validation.data;

    // Vérifier que le Kidoo existe et appartient à l'utilisateur
    const existingKidoo = await prisma.kidoo.findUnique({
      where: { id },
    });

    if (!existingKidoo) {
      return createErrorResponse(KidooErrors.NOT_FOUND);
    }

    if (existingKidoo.userId !== userId) {
      return createErrorResponse(KidooErrors.NOT_OWNED);
    }

    // Mettre à jour le nom du Kidoo
    const updatedKidoo = await prisma.kidoo.update({
      where: { id },
      data: { name },
    });

    // Convertir les dates en ISO strings
    const kidooWithISOStrings = {
      ...updatedKidoo,
      lastConnected: updatedKidoo.lastConnected?.toISOString() || null,
      createdAt: updatedKidoo.createdAt.toISOString(),
      updatedAt: updatedKidoo.updatedAt.toISOString(),
    };

    return createSuccessResponse(kidooWithISOStrings, {
      message: 'Nom du Kidoo mis à jour avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du nom du Kidoo:', error);
    return createErrorResponse(KidooErrors.INTERNAL_ERROR, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
