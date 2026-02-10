/**
 * POST /api/admin/clips/[id]/convert
 * Lance manuellement la conversion .bin à partir du preview existant.
 * Utilisé quand previewUrl existe mais fileUrl est absent.
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { processClipFromPreviewUrl } from '@/lib/clipWorker';

export const POST = withAdminAuth(
  async (_request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: clipId } = await params;

      const clip = await prisma.clip.findUnique({ where: { id: clipId } });
      if (!clip) {
        return createErrorResponse('CLIP_NOT_FOUND', 404);
      }
      const effectivePreviewUrl = clip.workingPreviewUrl ?? clip.previewUrl;
      if (!effectivePreviewUrl) {
        return createErrorResponse('VALIDATION_ERROR', 400, {
          message: 'Aucun preview pour ce clip. Impossible de convertir sans source.',
        });
      }
      if (clip.fileUrl) {
        return createErrorResponse('VALIDATION_ERROR', 400, {
          message: 'Ce clip a déjà un fichier .bin. Aucune conversion nécessaire.',
        });
      }

      const fps = clip.fps ?? 10;
      const totalFrames = clip.frames ?? (clip.durationS ? Math.ceil(clip.durationS * fps) : 30);
      const loopStart = clip.loopStartFrame ?? 0;
      const loopEnd = clip.loopEndFrame ?? totalFrames - 1;
      const loopFrameCount = Math.max(1, loopEnd - loopStart + 1);
      const startS = loopStart / fps;
      const durationS = loopFrameCount / fps;

      const transcodeOpts = {
        fps,
        maxFrames: loopFrameCount + 5,
        maxDurationS: durationS + 0.5,
        startS: startS > 0 ? startS : undefined,
        width: clip.width ?? 240,
        height: clip.height ?? 280,
      };

      const workerResult = await processClipFromPreviewUrl(clipId, effectivePreviewUrl, transcodeOpts);

      if ('error' in workerResult) {
        return createErrorResponse('CONVERSION_FAILED', 502, {
          message: workerResult.error,
        });
      }

      await prisma.clip.update({
        where: { id: clipId },
        data: {
          status: 'READY',
          fileUrl: workerResult.fileUrl,
          sha256: workerResult.sha256,
          sizeBytes: workerResult.sizeBytes,
          width: clip.width ?? 240,
          height: clip.height ?? 280,
          fps,
          frames: loopFrameCount,
        },
      });

      return createSuccessResponse({
        clipId,
        status: 'READY',
        fileUrl: workerResult.fileUrl,
      });
    } catch (error) {
      console.error('Erreur lors de la conversion manuelle du clip:', error);
      return createErrorResponse('INTERNAL_ERROR', 500, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);
