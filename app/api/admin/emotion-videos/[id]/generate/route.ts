/**
 * POST /api/admin/emotion-videos/[id]/generate - Génère le JSON de prévisualisation pour l'ESP32
 *
 * Retourne un JSON avec les métadonnées et les timelines de chaque phase :
 * {
 *   "success": true,
 *   "data": {
 *     "emotionId": string,
 *     "emotionKey": string,
 *     "fps": number,
 *     "width": number,
 *     "height": number,
 *     "totalFrames": number,
 *     "durationS": number,
 *     "phases": {
 *       "intro": { "frames": number, "timeline": number[] },
 *       "loop": { "frames": number, "timeline": number[] },
 *       "exit": { "frames": number, "timeline": number[] }
 *     }
 *   }
 * }
 *
 * Pour extraire le sourceFrameIndex de chaque frame :
 * - Si type='full' : utilise directement frame.sourceFrameIndex
 * - Si type='composite' : utilise le sourceFrameIndex de la première région disponible (leftEye, rightEye, ou mouth)
 * - Si aucun sourceFrameIndex disponible : retourne null
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
              frames: true,
              previewUrl: true,
            },
          },
          emotion: true,
        },
      });

      if (!emotionVideo) {
        return createErrorResponse('EMOTION_VIDEO_NOT_FOUND', 404);
      }

      if (!emotionVideo.emotion) {
        return createErrorResponse('EMOTION_NOT_FOUND', 404, {
          details: 'L\'émotion associée n\'a pas été trouvée',
        });
      }

      // Récupérer les 3 timelines (avec vérification de sécurité)
      const introTimeline = Array.isArray(emotionVideo.introTimeline)
        ? (emotionVideo.introTimeline as unknown as TimelineFrame[])
        : [];
      const loopTimeline = Array.isArray(emotionVideo.loopTimeline)
        ? (emotionVideo.loopTimeline as unknown as TimelineFrame[])
        : [];
      const exitTimeline = Array.isArray(emotionVideo.exitTimeline)
        ? (emotionVideo.exitTimeline as unknown as TimelineFrame[])
        : [];

      const totalFrames = introTimeline.length + loopTimeline.length + exitTimeline.length;

      if (totalFrames === 0) {
        return createErrorResponse('NO_FRAMES', 400, {
          details: 'Aucune frame dans les timelines',
        });
      }

      // Fonction helper pour extraire le sourceFrameIndex d'une frame
      const getSourceFrameIndex = (frame: TimelineFrame): number | null => {
        // Si c'est une frame 'full', retourner directement le sourceFrameIndex
        if (frame.type === 'full' && frame.sourceFrameIndex !== undefined) {
          return frame.sourceFrameIndex;
        }

        // Si c'est une frame 'composite', prendre le sourceFrameIndex de la première région disponible
        if (frame.type === 'composite' && frame.regions) {
          if (frame.regions.leftEye?.sourceFrameIndex !== undefined) {
            return frame.regions.leftEye.sourceFrameIndex;
          }
          if (frame.regions.rightEye?.sourceFrameIndex !== undefined) {
            return frame.regions.rightEye.sourceFrameIndex;
          }
          if (frame.regions.mouth?.sourceFrameIndex !== undefined) {
            return frame.regions.mouth.sourceFrameIndex;
          }
        }

        return null;
      };

      // Extraire les sourceFrameIndex de toutes les frames de chaque phase
      const introTimeline_indexes = introTimeline.map(getSourceFrameIndex);
      const loopTimeline_indexes = loopTimeline.map(getSourceFrameIndex);
      const exitTimeline_indexes = exitTimeline.map(getSourceFrameIndex);

      // Calculer la durée en secondes
      const durationS = totalFrames / emotionVideo.fps;

      // Retourner le JSON de prévisualisation pour l'ESP
      return createSuccessResponse({
        emotionId: emotionVideo.emotionId,
        emotionKey: emotionVideo.emotion.key,
        fps: emotionVideo.fps,
        width: emotionVideo.width,
        height: emotionVideo.height,
        totalFrames,
        durationS,
        phases: {
          intro: {
            frames: introTimeline.length,
            timeline: introTimeline_indexes,
          },
          loop: {
            frames: loopTimeline.length,
            timeline: loopTimeline_indexes,
          },
          exit: {
            frames: exitTimeline.length,
            timeline: exitTimeline_indexes,
          },
        },
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
