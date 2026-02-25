/**
 * POST /api/admin/clips/upload
 * Ajoute un clip manuellement en uploadant un fichier MP4.
 * Body: FormData { characterId: string, emotionKey: string, file: File (MP4) }
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { uploadClipFile } from '@/lib/r2';
import { CLIP_DEFAULT_FPS } from '@/lib/xai';
import { getVideoMetadataFromBuffer } from '@/lib/getVideoMetadata';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 Mo
const ALLOWED_TYPES = ['video/mp4', 'video/x-mp4'];

export const POST = withAdminAuth(async (request: AdminAuthenticatedRequest) => {
  try {
    const formData = await request.formData();

    const characterId = formData.get('characterId');
    const emotionKey = formData.get('emotionKey');
    const file = formData.get('file');

    if (typeof characterId !== 'string' || !characterId) {
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: 'characterId requis',
        field: 'characterId',
      });
    }
    if (typeof emotionKey !== 'string' || !emotionKey) {
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: 'emotionKey requis',
        field: 'emotionKey',
      });
    }
    if (!(file instanceof File)) {
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: 'Fichier MP4 requis',
        field: 'file',
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} Mo)`,
        field: 'file',
      });
    }

    const contentType = file.type || '';
    if (!ALLOWED_TYPES.includes(contentType) && !file.name.toLowerCase().endsWith('.mp4')) {
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: 'Format non supporté. Utilisez un fichier MP4.',
        field: 'file',
      });
    }

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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const meta = await getVideoMetadataFromBuffer(buffer, CLIP_DEFAULT_FPS);
    const fps = meta.fps > 0 ? Math.round(meta.fps) : CLIP_DEFAULT_FPS;
    // Si ffprobe n'a pas pu lire la durée (ex. ffprobe absent), fallback 3s pour éviter "1 frame"
    const durationS = meta.durationS > 0 ? meta.durationS : 3;
    const frames = Math.ceil(durationS * fps);

    const clip = await prisma.clip.create({
      data: {
        characterId,
        emotionId: emotion.id,
        status: 'READY',
        prompt: 'Import manuel',
        modelName: 'manual-upload',
        width: meta.width ?? character.imageWidth,
        height: meta.height ?? character.imageHeight,
        fps,
        durationS,
        frames,
      },
      include: { emotion: true },
    });

    const previewUrl = await uploadClipFile(clip.id, 'preview.mp4', buffer, 'video/mp4');

    await prisma.clip.update({
      where: { id: clip.id },
      data: {
        previewUrl,
        workingPreviewUrl: previewUrl,
      },
    });

    return createSuccessResponse(
      {
        clipId: clip.id,
        status: 'READY',
        previewUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erreur upload clip manuel:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
