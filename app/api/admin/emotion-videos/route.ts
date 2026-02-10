/**
 * POST /api/admin/emotion-videos - Crée une nouvelle EmotionVideo
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import type { TimelineFrame } from '@/types/emotion-video';

interface CreateEmotionVideoBody {
  emotionId: string;
  sourceClipId: string;
  name?: string;
  introTimeline: TimelineFrame[];
  loopTimeline: TimelineFrame[];
  exitTimeline: TimelineFrame[];
}

export const POST = withAdminAuth(async (request: AdminAuthenticatedRequest) => {
  try {
    const body = (await request.json()) as CreateEmotionVideoBody;

    // Validation basique
    if (!body.emotionId || !body.sourceClipId) {
      return createErrorResponse('INVALID_INPUT', 400);
    }

    // S'assurer que les 3 timelines sont des tableaux (même vides)
    const introTimeline = Array.isArray(body.introTimeline) ? body.introTimeline : [];
    const loopTimeline = Array.isArray(body.loopTimeline) ? body.loopTimeline : [];
    const exitTimeline = Array.isArray(body.exitTimeline) ? body.exitTimeline : [];

    // Calculer le total de frames
    const totalFrames = introTimeline.length + loopTimeline.length + exitTimeline.length;

    // Avertissement si on dépasse 60 frames (6 secondes à 10 FPS)
    const recommendedMaxFrames = 60;
    if (totalFrames > recommendedMaxFrames) {
      console.warn(`⚠️ EmotionVideo: ${totalFrames} frames (recommandé: ${recommendedMaxFrames} max pour 6s @ 10 FPS)`);
    }

    // Vérifier que le clip source existe
    const sourceClip = await prisma.clip.findUnique({
      where: { id: body.sourceClipId },
      select: { id: true, fps: true, width: true, height: true },
    });

    if (!sourceClip) {
      return createErrorResponse('SOURCE_CLIP_NOT_FOUND', 404);
    }

    const fps = sourceClip.fps ?? 10;

    // Créer ou mettre à jour l'EmotionVideo (upsert pour respecter la contrainte unique)
    const emotionVideo = await prisma.emotionVideo.upsert({
      where: {
        sourceClipId_emotionId: {
          sourceClipId: body.sourceClipId,
          emotionId: body.emotionId,
        },
      },
      create: {
        emotionId: body.emotionId,
        sourceClipId: body.sourceClipId,
        name: body.name ?? null,
        fps,
        width: sourceClip.width ?? 240,
        height: sourceClip.height ?? 280,
        introTimeline: introTimeline as any,
        loopTimeline: loopTimeline as any,
        exitTimeline: exitTimeline as any,
        totalFrames,
        durationS: totalFrames / fps,
      },
      update: {
        name: body.name ?? null,
        introTimeline: introTimeline as any,
        loopTimeline: loopTimeline as any,
        exitTimeline: exitTimeline as any,
        totalFrames,
        durationS: totalFrames / fps,
      },
      include: {
        emotion: true,
        sourceClip: { select: { id: true, characterId: true } },
      },
    });

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

    return createSuccessResponse(withISO, 201);
  } catch (error) {
    console.error('Erreur lors de la création de l\'EmotionVideo:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
