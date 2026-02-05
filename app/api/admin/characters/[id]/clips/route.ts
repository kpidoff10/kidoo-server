/**
 * GET /api/admin/characters/[id]/clips - List clips for a character (with emotion)
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

export const GET = withAdminAuth(
  async (_request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: characterId } = await params;

      const character = await prisma.character.findUnique({ where: { id: characterId } });
      if (!character) {
        return createErrorResponse('CHARACTER_NOT_FOUND', 404);
      }

      const clips = await prisma.clip.findMany({
        where: { characterId },
        include: { emotion: true },
        orderBy: [{ emotion: { key: 'asc' } }, { createdAt: 'desc' }],
      });

      const withISO = clips.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        emotion: {
          ...c.emotion,
          createdAt: c.emotion.createdAt.toISOString(),
          updatedAt: c.emotion.updatedAt.toISOString(),
        },
      }));

      return createSuccessResponse(withISO);
    } catch (error) {
      console.error('Erreur lors de la récupération des clips:', error);
      return createErrorResponse('INTERNAL_ERROR', 500, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);
