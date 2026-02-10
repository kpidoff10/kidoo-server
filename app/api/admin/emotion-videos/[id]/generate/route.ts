/**
 * POST /api/admin/emotion-videos/[id]/generate - Génère le fichier MJPEG pour l'ESP32
 *
 * Processus :
 * 1. Passe le status à GENERATING
 * 2. Transcode le clip source en MJPEG, réordonne les frames selon la timeline
 * 3. Upload le .mjpeg sur R2
 * 4. Met à jour l'EmotionVideo avec binUrl, sha256, sizeBytes, status=READY
 *
 * Retourne l'EmotionVideo mise à jour.
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { generateEmotionVideoMjpeg } from '@/lib/emotionVideoWorker';

export const POST = withAdminAuth(
  async (_request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      // Vérifier que l'EmotionVideo existe
      const emotionVideo = await prisma.emotionVideo.findUnique({
        where: { id },
        include: { emotion: true },
      });

      if (!emotionVideo) {
        return createErrorResponse('EMOTION_VIDEO_NOT_FOUND', 404);
      }

      if (!emotionVideo.emotion) {
        return createErrorResponse('EMOTION_NOT_FOUND', 404, {
          details: 'L\'émotion associée n\'a pas été trouvée',
        });
      }

      // Passer en GENERATING
      await prisma.emotionVideo.update({
        where: { id },
        data: { status: 'GENERATING' },
      });

      // Générer le MJPEG
      const result = await generateEmotionVideoMjpeg(id);

      if ('error' in result) {
        // Échec : passer en FAILED
        await prisma.emotionVideo.update({
          where: { id },
          data: { status: 'FAILED' },
        });

        return createErrorResponse('GENERATION_FAILED', 500, {
          details: result.error,
        });
      }

      // Succès : mettre à jour avec les résultats
      const updated = await prisma.emotionVideo.update({
        where: { id },
        data: {
          status: 'READY',
          binUrl: result.binUrl,
          idxUrl: result.idxUrl,
          sha256: result.sha256,
          sizeBytes: result.sizeBytes,
          totalFrames: result.totalFrames,
          durationS: result.durationS,
        },
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
        sha256: updated.sha256,
        sizeBytes: updated.sizeBytes,
        totalFrames: updated.totalFrames,
        durationS: updated.durationS,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error('Erreur lors de la génération de l\'EmotionVideo:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      return createErrorResponse('INTERNAL_ERROR', 500, {
        details: error instanceof Error
          ? { message: error.message, stack: error.stack }
          : undefined,
      });
    }
  }
);
