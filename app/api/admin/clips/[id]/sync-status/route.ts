/**
 * POST /api/admin/clips/[id]/sync-status
 * Interroge xAI pour le statut du job, télécharge la vidéo MP4, l'upload sur R2, puis met le clip en READY.
 * Le transcodage MJPEG est fait plus tard dans "Création de la vidéo".
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { getVideoGenerationResult } from '@/lib/xai';
import { uploadVideoPreviewToR2 } from '@/lib/clipWorker';

export const POST = withAdminAuth(
  async (_request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: clipId } = await params;

      const clip = await prisma.clip.findUnique({ where: { id: clipId } });
      if (!clip) {
        return createErrorResponse('CLIP_NOT_FOUND', 404);
      }
      if (clip.status !== 'GENERATING' || !clip.xaiJobId) {
        return createSuccessResponse({
          clipId,
          status: clip.status,
          message: clip.xaiJobId ? undefined : 'Aucun job xAI associé.',
        });
      }

      const result = await getVideoGenerationResult(clip.xaiJobId);

      if (result.status === 'completed' && result.videoUrl) {
        const workerResult = await uploadVideoPreviewToR2(clipId, result.videoUrl);

        if ('error' in workerResult) {
          await prisma.clip.update({
            where: { id: clipId },
            data: { status: 'FAILED' },
          });
          return createErrorResponse('UPLOAD_R2_FAILED', 502, {
            message: workerResult.error,
          });
        }

        await prisma.clip.update({
          where: { id: clipId },
          data: {
            status: 'READY',
            previewUrl: workerResult.previewUrl,
            workingPreviewUrl: workerResult.previewUrl,
          },
        });

        return createSuccessResponse({
          clipId,
          status: 'READY',
          previewUrl: workerResult.previewUrl,
        });
      }
      if (result.status === 'failed') {
        await prisma.clip.update({
          where: { id: clipId },
          data: { status: 'FAILED' },
        });
        return createErrorResponse('GENERATION_FAILED', 502, {
          message: result.error ?? 'Job xAI en échec',
        });
      }

      return createSuccessResponse({
        clipId,
        status: 'GENERATING',
        jobStatus: result.status,
        message:
          result.error ||
          (result.status === 'in_progress' || result.status === 'queued'
            ? 'Toujours en cours côté xAI. Réessayez dans quelques secondes.'
            : undefined),
      });
    } catch (error) {
      console.error('Erreur lors du sync du statut clip:', error);
      return createErrorResponse('INTERNAL_ERROR', 500, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);
