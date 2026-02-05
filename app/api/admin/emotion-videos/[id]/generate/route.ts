/**
 * POST /api/admin/emotion-videos/[id]/generate - Génère le fichier .bin pour l'ESP32
 *
 * Structure du fichier .bin :
 * [HEADER - 32 bytes]
 * - Magic number "KID0" (4 bytes)
 * - Version (2 bytes, little-endian) = 1
 * - FPS (1 byte)
 * - Intro frame count (2 bytes, little-endian)
 * - Loop frame count (2 bytes, little-endian)
 * - Exit frame count (2 bytes, little-endian)
 * - Width (2 bytes, little-endian)
 * - Height (2 bytes, little-endian)
 * - Total frames (2 bytes, little-endian)
 * - Reserved (15 bytes) = 0x00
 *
 * [FRAMES DATA - concatenated intro + loop + exit]
 * - Chaque frame : width * height * 2 bytes (RGB565 format)
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import type { TimelineFrame } from '@/types/emotion-video';

export const POST = withAdminAuth(
  async (_request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      const emotionVideo = await prisma.emotionVideo.findUnique({
        where: { id },
        include: {
          sourceClip: {
            select: {
              id: true,
              characterId: true,
              fps: true,
              width: true,
              height: true,
              totalFrames: true,
              previewUrl: true,
              regionsByFrame: true,
              artifactsByFrame: true,
            },
          },
          emotion: true,
        },
      });

      if (!emotionVideo) {
        return createErrorResponse('EMOTION_VIDEO_NOT_FOUND', 404);
      }

      // Récupérer les 3 timelines
      const introTimeline = emotionVideo.introTimeline as TimelineFrame[];
      const loopTimeline = emotionVideo.loopTimeline as TimelineFrame[];
      const exitTimeline = emotionVideo.exitTimeline as TimelineFrame[];

      const totalFrames = introTimeline.length + loopTimeline.length + exitTimeline.length;

      if (totalFrames === 0) {
        return createErrorResponse('NO_FRAMES', 400, {
          details: 'Aucune frame dans les timelines',
        });
      }

      // TODO: Implémenter la génération du .bin
      //
      // Étapes à implémenter :
      // 1. Pour chaque frame de introTimeline :
      //    - Si type='full' : lire les pixels RGB565 de sourceFrameIndex du clip source
      //    - Si type='composite' : composer les pixels depuis les régions (leftEye, rightEye, mouth) + artifacts
      // 2. Répéter pour loopTimeline
      // 3. Répéter pour exitTimeline
      // 4. Créer le header (32 bytes) avec les métadonnées :
      //    - Magic "KID0" + Version 1 + FPS + intro/loop/exit counts + width/height + totalFrames
      // 5. Concaténer : [HEADER][INTRO_PIXELS][LOOP_PIXELS][EXIT_PIXELS]
      // 6. Uploader sur Cloudflare R2
      // 7. Calculer le SHA256
      // 8. Mettre à jour la DB avec binUrl, sha256, sizeBytes, status='READY'
      //
      // Taille estimée : 32 bytes (header) + totalFrames * width * height * 2 bytes

      // Pour l'instant, on marque comme FAILED avec message explicite
      const updated = await prisma.emotionVideo.update({
        where: { id },
        data: {
          status: 'FAILED',
          binUrl: null,
          sha256: null,
          sizeBytes: null,
        },
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

      // Calculer la taille estimée du .bin
      const headerSize = 32; // bytes
      const pixelsPerFrame = emotionVideo.width * emotionVideo.height * 2; // RGB565 = 2 bytes per pixel
      const estimatedSize = headerSize + (totalFrames * pixelsPerFrame);

      return createSuccessResponse(withISO, {
        message: '⚠️ Génération du .bin : TODO - Non implémenté',
        info: {
          totalFrames,
          phases: {
            intro: introTimeline.length,
            loop: loopTimeline.length,
            exit: exitTimeline.length,
          },
          dimensions: {
            width: emotionVideo.width,
            height: emotionVideo.height,
            fps: emotionVideo.fps,
          },
          estimatedSize: {
            bytes: estimatedSize,
            kilobytes: Math.round(estimatedSize / 1024),
            formatted: `${(estimatedSize / 1024).toFixed(2)} KB`,
          },
        },
      });
    } catch (error) {
      console.error('Erreur lors de la génération de l\'EmotionVideo:', error);
      return createErrorResponse('INTERNAL_ERROR', 500, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);
