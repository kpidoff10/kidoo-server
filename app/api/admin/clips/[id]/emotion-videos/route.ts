/**
 * GET /api/admin/clips/[id]/emotion-videos - Liste les EmotionVideos pour un clip source
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

export const GET = withAdminAuth(
  async (_request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: clipId } = await params;

      // Vérifier que le clip existe
      const clip = await prisma.clip.findUnique({
        where: { id: clipId },
        select: { id: true },
      });

      if (!clip) {
        return createErrorResponse('CLIP_NOT_FOUND', 404);
      }

      const emotionVideos = await prisma.emotionVideo.findMany({
        where: { sourceClipId: clipId },
        include: {
          emotion: { select: { id: true, key: true, label: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const withISO = emotionVideos.map((ev) => ({
        ...ev,
        createdAt: ev.createdAt.toISOString(),
        updatedAt: ev.updatedAt.toISOString(),
        emotion: {
          ...ev.emotion,
        },
      }));

      return createSuccessResponse(withISO);
    } catch (error) {
      console.error('Erreur lors de la récupération des EmotionVideos:', error);
      return createErrorResponse('INTERNAL_ERROR', 500, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);
