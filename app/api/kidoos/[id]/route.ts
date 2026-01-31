/**
 * Routes API pour un Kidoo spécifique
 * GET /api/kidoos/[id] - Récupérer un kidoo par son ID
 * PUT /api/kidoos/[id] - Mettre à jour un kidoo
 * DELETE /api/kidoos/[id] - Supprimer un kidoo
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateKidooInputSchema } from '@/shared';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { KidooErrors } from './errors';

/**
 * GET /api/kidoos/[id]
 * Récupère un kidoo par son ID
 */
export const GET = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { userId } = request;
    const { id } = await params;

    // Récupérer le kidoo avec sa configuration Basic
    const kidoo = await prisma.kidoo.findUnique({
      where: { id },
      include: {
        configBasic: true,
      },
    });

    if (!kidoo) {
      return createErrorResponse(KidooErrors.NOT_FOUND);
    }

    // Vérifier que le kidoo appartient à l'utilisateur
    if (kidoo.userId !== userId) {
      return createErrorResponse(KidooErrors.NOT_OWNED);
    }

    // Convertir les dates en ISO strings et les BigInt en Number
    const kidooWithISOStrings = {
      ...kidoo,
      lastConnected: kidoo.lastConnected?.toISOString() || null,
      createdAt: kidoo.createdAt.toISOString(),
      updatedAt: kidoo.updatedAt.toISOString(),
      configBasic: kidoo.configBasic ? {
        ...kidoo.configBasic,
        storageTotalBytes: kidoo.configBasic.storageTotalBytes ? Number(kidoo.configBasic.storageTotalBytes) : null,
        storageFreeBytes: kidoo.configBasic.storageFreeBytes ? Number(kidoo.configBasic.storageFreeBytes) : null,
        storageUsedBytes: kidoo.configBasic.storageUsedBytes ? Number(kidoo.configBasic.storageUsedBytes) : null,
        createdAt: kidoo.configBasic.createdAt.toISOString(),
        updatedAt: kidoo.configBasic.updatedAt.toISOString(),
        storageLastUpdated: kidoo.configBasic.storageLastUpdated?.toISOString() || null,
      } : null,
    };

    return createSuccessResponse(kidooWithISOStrings, {
      message: 'Kidoo trouvé',
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du kidoo:', error);
    return createErrorResponse(KidooErrors.INTERNAL_ERROR, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * PUT /api/kidoos/[id]
 * Met à jour un kidoo par son ID
 */
export const PUT = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { userId } = request;
    const { id } = await params;

    // Récupérer le body de la requête
    const body = await request.json();

    // Valider les données avec le schéma
    const validationResult = updateKidooInputSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return createErrorResponse(KidooErrors.VALIDATION_ERROR, {
        message: firstError?.message || 'Données invalides',
        field: firstError?.path[0] as string,
        details: validationResult.error.issues,
      });
    }

    const data = validationResult.data;

    // Vérifier que le kidoo existe et appartient à l'utilisateur
    const existingKidoo = await prisma.kidoo.findUnique({
      where: { id },
    });

    if (!existingKidoo) {
      return createErrorResponse(KidooErrors.NOT_FOUND);
    }

    if (existingKidoo.userId !== userId) {
      return createErrorResponse(KidooErrors.NOT_OWNED);
    }

    // Préparer les données à mettre à jour
    const updateData: {
      name?: string;
      macAddress?: string | null;
      wifiSSID?: string | null;
      isConnected?: boolean;
      lastConnected?: Date | null;
    } = {};
    
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.macAddress !== undefined) {
      updateData.macAddress = data.macAddress;
    }
    if (data.wifiSSID !== undefined) {
      updateData.wifiSSID = data.wifiSSID;
    }

    // Mettre à jour le kidoo
    const updatedKidoo = await prisma.kidoo.update({
      where: { id },
      data: updateData,
    });

    // Convertir les dates en ISO strings
    const kidooWithISOStrings = {
      ...updatedKidoo,
      lastConnected: updatedKidoo.lastConnected?.toISOString() || null,
      createdAt: updatedKidoo.createdAt.toISOString(),
      updatedAt: updatedKidoo.updatedAt.toISOString(),
    };

    return createSuccessResponse(kidooWithISOStrings, {
      message: 'Kidoo mis à jour avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du kidoo:', error);
    return createErrorResponse(KidooErrors.INTERNAL_ERROR, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * DELETE /api/kidoos/[id]
 * Supprime un kidoo par son ID
 */
export const DELETE = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { userId } = request;
    const { id } = await params;

    // Vérifier que le kidoo existe et appartient à l'utilisateur
    const existingKidoo = await prisma.kidoo.findUnique({
      where: { id },
    });

    if (!existingKidoo) {
      return createErrorResponse(KidooErrors.NOT_FOUND);
    }

    if (existingKidoo.userId !== userId) {
      return createErrorResponse(KidooErrors.NOT_OWNED);
    }

    // Supprimer le kidoo
    await prisma.kidoo.delete({
      where: { id },
    });

    return createSuccessResponse(null, {
      message: 'Kidoo supprimé avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du kidoo:', error);
    return createErrorResponse(KidooErrors.INTERNAL_ERROR, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
