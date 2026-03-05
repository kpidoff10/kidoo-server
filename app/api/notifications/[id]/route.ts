/**
 * PATCH /api/notifications/[id] - Marquer comme lue
 * DELETE /api/notifications/[id] - Supprimer une notification
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';

/**
 * PATCH /api/notifications/[id]
 * Marquer une notification comme lue/non lue
 */
export const PATCH = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { userId } = request;
    const { id } = await params;
    const body = await request.json();
    const { isRead } = body;

    if (typeof isRead !== 'boolean') {
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: 'isRead doit être un booléen',
      });
    }

    // Vérifier que la notification appartient à l'utilisateur
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      return createErrorResponse('NOT_FOUND', 404, { message: 'Notification non trouvée' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead,
        readAt: isRead ? new Date() : null,
      },
    });

    return createSuccessResponse(updated);
  } catch (error) {
    console.error('Erreur mise à jour notification:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * DELETE /api/notifications/[id]
 * Supprimer une notification
 */
export const DELETE = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { userId } = request;
    const { id } = await params;

    // Vérifier que la notification appartient à l'utilisateur
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      return createErrorResponse('NOT_FOUND', 404, { message: 'Notification non trouvée' });
    }

    await prisma.notification.delete({
      where: { id },
    });

    return createSuccessResponse({ id, deleted: true });
  } catch (error) {
    console.error('Erreur suppression notification:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
