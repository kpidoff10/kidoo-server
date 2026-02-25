/**
 * GET /api/admin/emotions - List all emotions
 * POST /api/admin/emotions - Create an emotion (admin only)
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { EmotionErrors } from './errors';
import { z } from 'zod';

const createEmotionSchema = z.object({
  key: z.string().min(1).max(50).regex(/^[A-Z0-9_]+$/, 'Clé en majuscules et underscores'),
  label: z.string().min(1).max(200),
  promptCustom: z.string().max(500).nullable().optional(),
});

export const GET = withAdminAuth(async (_request: AdminAuthenticatedRequest) => {
  try {
    const emotions = await prisma.emotion.findMany({
      orderBy: { key: 'asc' },
    });

    const withISO = emotions.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }));

    return createSuccessResponse(withISO, {
      message: `${withISO.length} émotion(s) trouvée(s)`,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des émotions:', error);
    return createErrorResponse(EmotionErrors.INTERNAL_ERROR, 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

export const POST = withAdminAuth(async (request: AdminAuthenticatedRequest) => {
  try {
    const body = await request.json();
    const parsed = createEmotionSchema.safeParse(body);

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return createErrorResponse(EmotionErrors.VALIDATION_ERROR, 400, {
        message: first.message,
        field: String(first.path[0]),
      });
    }

    const { key, label, promptCustom } = parsed.data;

    const existing = await prisma.emotion.findUnique({ where: { key } });
    if (existing) {
      return createErrorResponse(EmotionErrors.CONFLICT, 409, {
        message: `Une émotion avec la clé "${key}" existe déjà`,
      });
    }

    const emotion = await prisma.emotion.create({
      data: { key, label, promptCustom: promptCustom ?? null },
    });

    return createSuccessResponse(
      {
        ...emotion,
        createdAt: emotion.createdAt.toISOString(),
        updatedAt: emotion.updatedAt.toISOString(),
      },
      { message: 'Émotion créée', status: 201 }
    );
  } catch (error) {
    console.error('Erreur lors de la création de l\'émotion:', error);
    return createErrorResponse(EmotionErrors.INTERNAL_ERROR, 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
