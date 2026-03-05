/**
 * GET /api/users/me/notifications - Récupère les notifications de l'utilisateur
 * DELETE /api/users/me/notifications - Supprime toutes les notifications
 */

import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';

/**
 * GET /api/users/me/notifications
 * Récupère les notifications avec pagination
 */
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { userId } = request;
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') ?? '0');

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { kidoo: { select: { id: true, name: true } } },
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return createSuccessResponse({
      notifications,
      total,
      unreadCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Erreur récupération notifications:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * DELETE /api/users/me/notifications
 * Supprime toutes les notifications de l'utilisateur
 */
export const DELETE = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { userId } = request;

    const deleted = await prisma.notification.deleteMany({
      where: { userId },
    });

    return createSuccessResponse({ deletedCount: deleted.count });
  } catch (error) {
    console.error('Erreur suppression notifications:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
