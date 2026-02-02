/**
 * GET /api/firmware/download?model=dream&version=1.0.1
 * Retourne l'URL du binaire pour l'ESP32 OTA.
 * Préfère l'URL R2 directe (publique ou presignée) pour que l'ESP télécharge depuis le stockage
 * sans passer par le serveur ; sinon fallback sur /api/firmware/serve.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { FirmwareErrors } from '@/app/api/admin/firmware/errors';
import { isKidooModelId } from '@kidoo/shared';
import type { KidooModel } from '@kidoo/shared/prisma';
import { getFirmwareDirectDownloadUrl } from '@/lib/r2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');
    const version = searchParams.get('version');
    const mac = searchParams.get('mac') ?? undefined;

    if (!model || !isKidooModelId(model)) {
      return createErrorResponse(FirmwareErrors.MODEL_INVALID, {
        message: 'Paramètre model requis et doit être un modèle valide (basic, dream, etc.)',
      });
    }

    if (!version || version.trim() === '') {
      return createErrorResponse(FirmwareErrors.VALIDATION_ERROR, {
        message: 'Paramètre version requis',
      });
    }

    const firmware = await prisma.firmware.findUnique({
      where: {
        model_version: {
          model: model as KidooModel,
          version: version.trim(),
        },
      },
      select: { version: true, path: true },
    });

    if (!firmware) {
      return createErrorResponse(FirmwareErrors.NOT_FOUND, {
        message: `Aucun firmware pour model=${model} version=${version}`,
      });
    }

    // URL serve (stream via le serveur) pour fallback si l'ESP échoue sur l'URL R2 directe (TLS/DNS).
    const requestOrigin = request.nextUrl.origin;
    const isUnreachable =
      requestOrigin.includes('0.0.0.0') ||
      requestOrigin.startsWith('http://localhost') ||
      requestOrigin.startsWith('http://127.0.0.1');
    const origin =
      isUnreachable && process.env.API_PUBLIC_ORIGIN
        ? process.env.API_PUBLIC_ORIGIN.replace(/\/$/, '')
        : requestOrigin;
    const serveUrl =
      `${origin}/api/firmware/serve?model=${encodeURIComponent(model)}&version=${encodeURIComponent(version.trim())}` +
      (mac?.trim() ? `&mac=${encodeURIComponent(mac.trim().replace(/[:-]/g, '').toUpperCase())}` : '');

    // Préférer l'URL R2 directe : l'ESP télécharge depuis le stockage (pas de stream via le serveur, pas de timeout Vercel).
    const directUrl = await getFirmwareDirectDownloadUrl(firmware.path, 3600);
    const MAX_ESP_URL_LEN = 1024; // ESP binUrl buffer
    let url: string;
    let fallbackUrl: string | undefined;
    if (directUrl != null && directUrl.length <= MAX_ESP_URL_LEN) {
      url = directUrl;
      fallbackUrl = serveUrl; // Retry possible si GET sur R2 échoue (ex. -1 TLS/DNS)
    } else {
      url = serveUrl;
    }

    return createSuccessResponse({
      url,
      ...(fallbackUrl != null && { fallbackUrl }),
      version: firmware.version,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'URL firmware:', error);
    return createErrorResponse(FirmwareErrors.INTERNAL_ERROR, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
}
