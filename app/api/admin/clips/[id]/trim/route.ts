/**
 * POST /api/admin/clips/[id]/trim
 * Découpe la vidéo preview (début/fin en secondes), upload le nouveau MP4 sur R2, met à jour le clip.
 * Ne régénère pas le .bin.
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { trimClipPreview } from '@/lib/clipWorker';

export const POST = withAdminAuth(
  async (request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: clipId } = await params;

      const clip = await prisma.clip.findUnique({ where: { id: clipId } });
      if (!clip) {
        return createErrorResponse('CLIP_NOT_FOUND', 404);
      }
      if (!clip.previewUrl) {
        return createErrorResponse('VALIDATION_ERROR', 400, {
          message: 'Aucun preview pour ce clip.',
        });
      }

      const body = (await request.json()) as { startTimeS?: number; endTimeS?: number };
      const startTimeS = Number(body.startTimeS);
      const endTimeS = Number(body.endTimeS);
      if (!Number.isFinite(startTimeS) || !Number.isFinite(endTimeS) || startTimeS < 0 || endTimeS <= startTimeS) {
        return createErrorResponse('VALIDATION_ERROR', 400, {
          message: 'startTimeS et endTimeS requis (nombre, startTimeS >= 0, endTimeS > startTimeS).',
        });
      }

      const { previewUrl: newPreviewUrl, durationS } = await trimClipPreview(
        clipId,
        clip.previewUrl,
        startTimeS,
        endTimeS
      );

      const fps = clip.fps ?? 10;
      const frames = Math.max(1, Math.ceil(durationS * fps));

      await prisma.clip.update({
        where: { id: clipId },
        data: {
          previewUrl: newPreviewUrl,
          durationS,
          frames,
          loopStartFrame: null,
          loopEndFrame: null,
        },
      });

      return createSuccessResponse({
        clipId,
        previewUrl: newPreviewUrl,
        durationS,
        frames,
      });
    } catch (error) {
      console.error('Erreur lors du trim du clip:', error);
      return createErrorResponse('INTERNAL_ERROR', 500, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);
