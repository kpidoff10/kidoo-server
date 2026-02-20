/**
 * POST /api/admin/emotion-videos/[id]/generate-anim - Génère uniquement le fichier .anim
 *
 * À partir du MJPEG déjà généré (binUrl), décode les frames, produit le .anim et met à jour animUrl.
 * Ne régénère pas le MJPEG.
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { generateEmotionVideoAnimOnly } from '@/lib/emotionVideoWorker';

export const POST = withAdminAuth(
  async (_request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      const emotionVideo = await prisma.emotionVideo.findUnique({
        where: { id },
        include: { emotion: true },
      });

      if (!emotionVideo) {
        return createErrorResponse('EMOTION_VIDEO_NOT_FOUND', 404);
      }

      const result = await generateEmotionVideoAnimOnly(id);

      if ('error' in result) {
        console.error('[generate-anim] Échec:', result.error);
        return createErrorResponse('GENERATION_ANIM_FAILED', 400, {
          details: result.error,
        });
      }

      const updated = await prisma.emotionVideo.update({
        where: { id },
        data: { animUrl: result.animUrl },
        include: { emotion: true },
      });

      return createSuccessResponse({
        id: updated.id,
        emotionId: updated.emotionId,
        sourceClipId: updated.sourceClipId,
        name: updated.name,
        fps: updated.fps,
        width: updated.width,
        height: updated.height,
        introTimeline: updated.introTimeline,
        loopTimeline: updated.loopTimeline,
        exitTimeline: updated.exitTimeline,
        status: updated.status,
        binUrl: updated.binUrl,
        idxUrl: updated.idxUrl,
        animUrl: updated.animUrl ?? null,
        sha256: updated.sha256,
        sizeBytes: updated.sizeBytes,
        totalFrames: updated.totalFrames,
        durationS: updated.durationS,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error('Erreur lors de la génération du .anim:', error);
      return createErrorResponse('INTERNAL_ERROR', 500, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);
