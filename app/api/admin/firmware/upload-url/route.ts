/**
 * POST /api/admin/firmware/upload-url
 * Retourne une URL signée pour upload direct vers R2 (Cloudflare)
 */

import { NextResponse } from 'next/server';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { FirmwareErrors } from '../errors';
import { isKidooModelId } from '@kidoo/shared';
import { createFirmwareUploadUrl } from '@/lib/r2';
import { z } from 'zod';

const bodySchema = z.object({
  model: z.string().refine(isKidooModelId),
  version: z.string().min(1).regex(/^[\d.]+(-[a-zA-Z0-9.]+)?$/),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
});

export const POST = withAdminAuth(async (request: AdminAuthenticatedRequest) => {
  try {
    const body = await request.json();
    const validation = bodySchema.safeParse(body);

    if (!validation.success) {
      const first = validation.error.issues[0];
      return createErrorResponse(FirmwareErrors.VALIDATION_ERROR, {
        message: first.message,
        field: first.path[0] as string,
      });
    }

    const { model, version, fileName, fileSize } = validation.data;

    const { uploadUrl, path, publicUrl } = await createFirmwareUploadUrl(
      model,
      version,
      fileName,
      fileSize
    );

    return createSuccessResponse(
      { uploadUrl, path, publicUrl },
      { message: 'URL d\'upload générée' }
    );
  } catch (error) {
    console.error('Erreur génération upload URL:', error);
    return createErrorResponse(FirmwareErrors.INTERNAL_ERROR, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
