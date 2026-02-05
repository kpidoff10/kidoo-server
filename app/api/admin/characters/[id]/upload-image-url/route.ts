/**
 * POST /api/admin/characters/[id]/upload-image-url
 * Retourne une URL signée pour upload direct de l'image personnage vers R2
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { CharacterErrors } from '../../errors';
import { createCharacterImageUploadUrl } from '@/lib/r2';

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const bodySchema = z.object({
  fileName: z.string().min(1).refine(
    (name) => /\.(jpg|jpeg|png|webp|gif)$/i.test(name),
    { message: 'Extension autorisée: jpg, jpeg, png, webp, gif' }
  ),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024), // 10 Mo max
  contentType: z.string().optional(),
});

export const POST = withAdminAuth(
  async (request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      const character = await prisma.character.findUnique({ where: { id } });
      if (!character) {
        return createErrorResponse(CharacterErrors.NOT_FOUND);
      }

      const body = await request.json();
      const parsed = bodySchema.safeParse(body);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        return createErrorResponse(CharacterErrors.VALIDATION_ERROR, {
          message: first.message,
          field: String(first.path[0]),
        });
      }

      const { fileName, fileSize, contentType } = parsed.data;
      const mimeType = contentType && ALLOWED_IMAGE_TYPES[contentType] ? contentType : 'image/jpeg';

      const { uploadUrl, path, publicUrl } = await createCharacterImageUploadUrl(
        id,
        fileName,
        fileSize,
        mimeType
      );

      return createSuccessResponse(
        { uploadUrl, path, publicUrl },
        { message: "URL d'upload générée" }
      );
    } catch (error) {
      console.error('Erreur génération upload URL image personnage:', error);
      return createErrorResponse(CharacterErrors.INTERNAL_ERROR, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);
