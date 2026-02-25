/**
 * GET /api/admin/emotions/[id] - Get one emotion
 * PATCH /api/admin/emotions/[id] - Update emotion (label only; key immutable)
 * DELETE /api/admin/emotions/[id] - Delete emotion
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { EmotionErrors } from '../errors';
import { z } from 'zod';

const updateEmotionSchema = z.object({
  label: z.string().min(1).max(200),
  promptCustom: z.string().max(500).nullable().optional(),
});

export const GET = withAdminAuth(
  async (_request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    try {
      const emotion = await prisma.emotion.findUnique({ where: { id } });
      if (!emotion) {
        return createErrorResponse(EmotionErrors.NOT_FOUND, 404);
      }
      return createSuccessResponse({
        ...emotion,
        createdAt: emotion.createdAt.toISOString(),
        updatedAt: emotion.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'émotion:', error);
      return createErrorResponse(EmotionErrors.INTERNAL_ERROR, 500, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);

export const PATCH = withAdminAuth(
  async (request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    try {
      const emotion = await prisma.emotion.findUnique({ where: { id } });
      if (!emotion) {
        return createErrorResponse(EmotionErrors.NOT_FOUND, 404);
      }

      const body = await request.json();
      const parsed = updateEmotionSchema.safeParse(body);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        return createErrorResponse(EmotionErrors.VALIDATION_ERROR, 400, {
          message: first.message,
          field: String(first.path[0]),
        });
      }

      const data: { label: string; promptCustom?: string | null } = { label: parsed.data.label };
      if (parsed.data.promptCustom !== undefined) {
        data.promptCustom = parsed.data.promptCustom;
      }
      const updated = await prisma.emotion.update({
        where: { id },
        data,
      });

      return createSuccessResponse({
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'émotion:', error);
      return createErrorResponse(EmotionErrors.INTERNAL_ERROR, 500, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);

export const DELETE = withAdminAuth(
  async (_request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    try {
      const emotion = await prisma.emotion.findUnique({ where: { id } });
      if (!emotion) {
        return createErrorResponse(EmotionErrors.NOT_FOUND, 404);
      }
      await prisma.emotion.delete({ where: { id } });
      return createSuccessResponse({ id });
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'émotion:', error);
      return createErrorResponse(EmotionErrors.INTERNAL_ERROR, 500, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);
