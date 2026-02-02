/**
 * GET /api/firmware/latest?model=basic
 * Dernière version du firmware pour un modèle (route publique pour l'app mobile)
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { FirmwareErrors } from '@/app/api/admin/firmware/errors';
import { isKidooModelId } from '@kidoo/shared';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');

    if (!model || !isKidooModelId(model)) {
      return createErrorResponse(FirmwareErrors.MODEL_INVALID, {
        message: 'Paramètre model requis et doit être un modèle valide (basic, dream, etc.)',
      });
    }

    const latest = await prisma.firmware.findFirst({
      where: { model },
      orderBy: { createdAt: 'desc' },
      select: { version: true, changelog: true },
    });

    return createSuccessResponse({
      version: latest?.version ?? null,
      changelog: latest?.changelog ?? null,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la dernière version firmware:', error);
    return createErrorResponse(FirmwareErrors.INTERNAL_ERROR, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
}
