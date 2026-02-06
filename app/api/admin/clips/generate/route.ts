/**
 * POST /api/admin/clips/generate
 * Génère un clip via xAI (Grok Imagine) à partir de l'image par défaut du personnage et de l'émotion.
 * Body: { characterId: string, emotionKey: string }
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import {
  buildPromptForEmotion,
  generateVideo,
  XAI_VIDEO_DURATION_SECONDS,
  CLIP_DEFAULT_FPS,
} from '@/lib/xai';
import { uploadVideoPreviewToR2 } from '@/lib/clipWorker';
import { z } from 'zod';

const bodySchema = z.object({
  characterId: z.string().uuid(),
  emotionKey: z.string().min(1),
});

export const POST = withAdminAuth(async (request: AdminAuthenticatedRequest) => {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: first.message,
        field: String(first.path[0]),
      });
    }

    const { characterId, emotionKey } = parsed.data;

    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) {
      return createErrorResponse('CHARACTER_NOT_FOUND', 404);
    }

    const emotion = await prisma.emotion.findUnique({ where: { key: emotionKey } });
    if (!emotion) {
      return createErrorResponse('EMOTION_NOT_FOUND', 404, {
        message: `Émotion "${emotionKey}" introuvable`,
      });
    }

    const prompt = buildPromptForEmotion(emotion.key, emotion.label, emotion.promptCustom);
    const imageUrl = character.defaultImageUrl ?? null;

    const fps = CLIP_DEFAULT_FPS;
    const clip = await prisma.clip.create({
      data: {
        characterId,
        emotionId: emotion.id,
        status: 'GENERATING',
        prompt,
        modelName: 'grok-imagine-video',
        durationS: XAI_VIDEO_DURATION_SECONDS,
        width: character.imageWidth,
        height: character.imageHeight,
        fps,
        frames: Math.ceil(XAI_VIDEO_DURATION_SECONDS * fps),
      },
      include: { emotion: true },
    });

    const result = await generateVideo({
      prompt,
      imageUrl,
      width: character.imageWidth ?? 240,
      height: character.imageHeight ?? 280,
    });

    if (result.error) {
      await prisma.clip.update({
        where: { id: clip.id },
        data: { status: 'FAILED' },
      });
      return createErrorResponse('GENERATION_FAILED', 502, {
        message: result.error,
      });
    }

    if (result.videoUrl) {
      const workerResult = await uploadVideoPreviewToR2(clip.id, result.videoUrl);

      if ('error' in workerResult) {
        await prisma.clip.update({
          where: { id: clip.id },
          data: { status: 'FAILED' },
        });
        return createErrorResponse('UPLOAD_R2_FAILED', 502, {
          message: workerResult.error,
        });
      }

      await prisma.clip.update({
        where: { id: clip.id },
        data: {
          status: 'READY',
          previewUrl: workerResult.previewUrl,
          workingPreviewUrl: workerResult.previewUrl,
        },
      });
    } else if (result.jobId) {
      await prisma.clip.update({
        where: { id: clip.id },
        data: { xaiJobId: result.jobId },
      });
    }

    return createSuccessResponse(
      {
        clipId: clip.id,
        jobId: result.jobId,
        status: result.videoUrl ? 'READY' : 'GENERATING',
        prompt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erreur lors de la génération du clip:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
