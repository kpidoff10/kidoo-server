/**
 * GET /api/admin/firmware?model=basic - Liste les firmwares par modèle
 * POST /api/admin/firmware - Crée un firmware (admin uniquement)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { FirmwareErrors } from './errors';
import { isKidooModelId, createFirmwareSchema } from '@kidoo/shared';
import type { KidooModel } from '@kidoo/shared/prisma';

export const GET = withAdminAuth(async (request: AdminAuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');

    if (!model || !isKidooModelId(model)) {
      return createErrorResponse(FirmwareErrors.MODEL_INVALID, {
        message: 'Paramètre model requis et doit être un modèle valide (basic, dream, etc.)',
      });
    }

    const firmwares = await prisma.firmware.findMany({
      where: { model: model as KidooModel },
      orderBy: { createdAt: 'desc' },
    });

    const firmwaresWithISO = firmwares.map((f) => ({
      ...f,
      createdAt: f.createdAt.toISOString(),
    }));

    return createSuccessResponse(firmwaresWithISO, {
      message: `${firmwares.length} firmware(s) trouvé(s)`,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des firmwares:', error);
    return createErrorResponse(FirmwareErrors.INTERNAL_ERROR, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * POST /api/admin/firmware
 * Crée un firmware (métadonnées uniquement - l'upload fichier sera géré séparément)
 */
export const POST = withAdminAuth(async (request: AdminAuthenticatedRequest) => {
  try {
    const body = await request.json();
    const validation = createFirmwareSchema.safeParse(body);

    if (!validation.success) {
      const first = validation.error.issues[0];
      return createErrorResponse(FirmwareErrors.VALIDATION_ERROR, {
        message: first.message,
        field: first.path[0] as string,
      });
    }

    const { model, version, url, path, fileName, fileSize, changelog } = validation.data;

    const existing = await prisma.firmware.findUnique({
      where: { model_version: { model: model as KidooModel, version } },
    });

    if (existing) {
      return createErrorResponse(FirmwareErrors.VERSION_EXISTS);
    }

    const firmware = await prisma.firmware.create({
      data: { model: model as KidooModel, version, url, path, fileName, fileSize, changelog: changelog ?? null },
    });

    return createSuccessResponse(
      { ...firmware, createdAt: firmware.createdAt.toISOString() },
      { message: 'Firmware créé', status: 201 }
    );
  } catch (error) {
    console.error('Erreur lors de la création du firmware:', error);
    return createErrorResponse(FirmwareErrors.INTERNAL_ERROR, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
