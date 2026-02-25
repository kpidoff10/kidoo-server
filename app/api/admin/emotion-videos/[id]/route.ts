/**
 * GET /api/admin/emotion-videos/[id] - Récupère une EmotionVideo par ID
 * PATCH /api/admin/emotion-videos/[id] - Met à jour une EmotionVideo
 * DELETE /api/admin/emotion-videos/[id] - Supprime une EmotionVideo
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import type { TimelineFrame } from '@/types/emotion-video';

export const GET = withAdminAuth(
  async (_request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      const emotionVideo = await prisma.emotionVideo.findUnique({
        where: { id },
        include: {
          emotion: true,
          sourceClip: { select: { id: true, characterId: true, previewUrl: true } },
        },
      });

      if (!emotionVideo) {
        return createErrorResponse('EMOTION_VIDEO_NOT_FOUND', 404);
      }

      const withISO = {
        ...emotionVideo,
        createdAt: emotionVideo.createdAt.toISOString(),
        updatedAt: emotionVideo.updatedAt.toISOString(),
        emotion: {
          ...emotionVideo.emotion,
          createdAt: emotionVideo.emotion.createdAt.toISOString(),
          updatedAt: emotionVideo.emotion.updatedAt.toISOString(),
        },
      };

      return createSuccessResponse(withISO);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'EmotionVideo:', error);
      return createErrorResponse('INTERNAL_ERROR', 500, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);

interface UpdateEmotionVideoBody {
  name?: string | null;
  introTimeline?: TimelineFrame[];
  loopTimeline?: TimelineFrame[];
  exitTimeline?: TimelineFrame[];
}

export const PATCH = withAdminAuth(
  async (request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const body = (await request.json()) as UpdateEmotionVideoBody;

      const existing = await prisma.emotionVideo.findUnique({
        where: { id },
        select: {
          fps: true,
          introTimeline: true,
          loopTimeline: true,
          exitTimeline: true,
        },
      });

      if (!existing) {
        return createErrorResponse('EMOTION_VIDEO_NOT_FOUND', 404);
      }

      // Calculer les nouvelles timelines (en utilisant les existantes si non fournies)
      const newIntro = body.introTimeline ?? (existing.introTimeline as unknown as TimelineFrame[]);
      const newLoop = body.loopTimeline ?? (existing.loopTimeline as unknown as TimelineFrame[]);
      const newExit = body.exitTimeline ?? (existing.exitTimeline as unknown as TimelineFrame[]);

      // Calculer le total de frames
      const totalFrames = newIntro.length + newLoop.length + newExit.length;

      // Avertissement si on dépasse 60 frames (6 secondes à 10 FPS)
      const recommendedMaxFrames = 60;
      if (totalFrames > recommendedMaxFrames) {
        console.warn(`⚠️ EmotionVideo ${id}: ${totalFrames} frames (recommandé: ${recommendedMaxFrames} max pour 6s @ 10 FPS)`);
      }

      const updateData: {
        name?: string | null;
        introTimeline?: any;
        loopTimeline?: any;
        exitTimeline?: any;
        totalFrames?: number;
        durationS?: number;
      } = {};

      if (body.name !== undefined) {
        updateData.name = body.name;
      }

      if (body.introTimeline !== undefined) {
        updateData.introTimeline = body.introTimeline as any;
      }

      if (body.loopTimeline !== undefined) {
        updateData.loopTimeline = body.loopTimeline as any;
      }

      if (body.exitTimeline !== undefined) {
        updateData.exitTimeline = body.exitTimeline as any;
      }

      // Mettre à jour totalFrames et durationS si une timeline a changé
      if (body.introTimeline !== undefined || body.loopTimeline !== undefined || body.exitTimeline !== undefined) {
        updateData.totalFrames = totalFrames;
        updateData.durationS = totalFrames / existing.fps;
      }

      const updated = await prisma.emotionVideo.update({
        where: { id },
        data: updateData,
        include: {
          emotion: true,
          sourceClip: { select: { id: true, characterId: true, previewUrl: true } },
        },
      });

      const withISO = {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        emotion: {
          ...updated.emotion,
          createdAt: updated.emotion.createdAt.toISOString(),
          updatedAt: updated.emotion.updatedAt.toISOString(),
        },
      };

      return createSuccessResponse(withISO);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'EmotionVideo:', error);
      return createErrorResponse('INTERNAL_ERROR', 500, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);

export const DELETE = withAdminAuth(
  async (_request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      const existing = await prisma.emotionVideo.findUnique({
        where: { id },
      });

      if (!existing) {
        return createErrorResponse('EMOTION_VIDEO_NOT_FOUND', 404);
      }

      await prisma.emotionVideo.delete({
        where: { id },
      });

      return createSuccessResponse({ success: true });
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'EmotionVideo:', error);
      return createErrorResponse('INTERNAL_ERROR', 500, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);
