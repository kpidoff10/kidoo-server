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
      if (!clip.previewUrl) {
        return createErrorResponse('VALIDATION_ERROR', 400, {
          message: 'Aucun preview pour ce clip. Impossible de convertir sans source.',
        });
      }
      if (clip.fileUrl) {
        return createErrorResponse('VALIDATION_ERROR', 400, {
          message: 'Ce clip a déjà un fichier .bin. Aucune conversion nécessaire.',
        });
      }

      const workerResult = await processClipFromPreviewUrl(clipId, clip.previewUrl);

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
      });
    } catch (error) {
      console.error('Erreur lors de la conversion manuelle du clip:', error);
      return createErrorResponse('INTERNAL_ERROR', 500, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);
