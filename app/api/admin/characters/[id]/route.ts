/**
 * GET /api/admin/characters/[id] - Get one character
 * PATCH /api/admin/characters/[id] - Update character
 * DELETE /api/admin/characters/[id] - Delete character
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { CharacterErrors } from '../errors';
import { updateCharacterSchema } from '@kidoo/shared';

export const GET = withAdminAuth(
  async (_request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      const character = await prisma.character.findUnique({
        where: { id },
      });

      if (!character) {
        return createErrorResponse(CharacterErrors.NOT_FOUND);
      }

      return createSuccessResponse({
        ...character,
        createdAt: character.createdAt.toISOString(),
        updatedAt: character.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du personnage:', error);
      return createErrorResponse(CharacterErrors.INTERNAL_ERROR, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);

export const PATCH = withAdminAuth(
  async (request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const body = await request.json();

      const parsed = updateCharacterSchema.safeParse({
        ...body,
        defaultImageUrl: body.defaultImageUrl === '' ? null : body.defaultImageUrl,
      });

      if (!parsed.success) {
        const first = parsed.error.issues[0];
        return createErrorResponse(CharacterErrors.VALIDATION_ERROR, {
          message: first.message,
          field: String(first.path[0]),
        });
      }

      const existing = await prisma.character.findUnique({ where: { id } });
      if (!existing) {
        return createErrorResponse(CharacterErrors.NOT_FOUND);
      }

      const character = await prisma.character.update({
        where: { id },
        data: {
          ...(parsed.data.name !== undefined && { name: parsed.data.name }),
          ...(parsed.data.defaultImageUrl !== undefined && {
            defaultImageUrl: parsed.data.defaultImageUrl,
          }),
          ...(parsed.data.sex !== undefined && { sex: parsed.data.sex }),
          ...(parsed.data.personality !== undefined && { personality: parsed.data.personality }),
          ...(parsed.data.imageWidth !== undefined && { imageWidth: parsed.data.imageWidth }),
          ...(parsed.data.imageHeight !== undefined && { imageHeight: parsed.data.imageHeight }),
        },
      });

      return createSuccessResponse({
        ...character,
        createdAt: character.createdAt.toISOString(),
        updatedAt: character.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du personnage:', error);
      return createErrorResponse(CharacterErrors.INTERNAL_ERROR, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);

export const DELETE = withAdminAuth(
  async (_request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      const existing = await prisma.character.findUnique({ where: { id } });
      if (!existing) {
        return createErrorResponse(CharacterErrors.NOT_FOUND);
      }

      await prisma.character.delete({ where: { id } });

      return createSuccessResponse({ id }, { message: 'Personnage supprimé' });
    } catch (error) {
      console.error('Erreur lors de la suppression du personnage:', error);
      return createErrorResponse(CharacterErrors.INTERNAL_ERROR, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);
