/**
 * POST /api/admin/clips/[id]/sync-status
 * Interroge xAI pour le statut du job, lance le job worker (transcode + upload R2), puis met le clip en READY.
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { getVideoGenerationResult } from '@/lib/xai';
import { processClipFromVideoUrl } from '@/lib/clipWorker';

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
        const workerResult = await processClipFromVideoUrl(clipId, result.videoUrl);

        if ('error' in workerResult) {
          await prisma.clip.update({
            where: { id: clipId },
            data: { status: 'FAILED' },
          });
          return createErrorResponse('GENERATION_FAILED', 502, {
            message: `Job worker: ${workerResult.error}`,
          });
        }

        await prisma.clip.update({
          where: { id: clipId },
          data: {
            status: 'READY',
            fileUrl: workerResult.fileUrl,
            previewUrl: workerResult.previewUrl,
            sha256: workerResult.sha256,
            sizeBytes: workerResult.sizeBytes,
            width: 240,
            height: 280,
            fps: 10,
            frames: 60,
          },
        });
        return createSuccessResponse({
          clipId,
          status: 'READY',
          fileUrl: workerResult.fileUrl,
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
