/**
 * POST /api/admin/clips/generate
 * Génère un clip via xAI (Grok Imagine) à partir de l'image par défaut du personnage et de l'émotion.
 * Body: { characterId: string, emotionKey: string }
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { buildPromptForEmotion, generateVideo } from '@/lib/xai';
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

    const clip = await prisma.clip.create({
      data: {
        characterId,
        emotionId: emotion.id,
        status: 'GENERATING',
        prompt,
        modelName: 'grok-imagine-video',
        durationS: 3,
        width: 240,
        height: 280,
        fps: 10,
        frames: 30,
      },
      include: { emotion: true },
    });

    const result = await generateVideo({ prompt, imageUrl });

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
      await prisma.clip.update({
        where: { id: clip.id },
        data: {
          status: 'READY',
          previewUrl: result.videoUrl,
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
