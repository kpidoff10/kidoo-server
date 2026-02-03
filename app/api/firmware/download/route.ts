/**
 * GET /api/firmware/download?model=dream&version=1.0.1
 * Retourne les URLs des binaires pour l'ESP32 OTA.
 * - partCount === 1 : url vers /api/firmware/serve.
 * - partCount > 1 : partCount + urls[] (une URL /api/firmware/serve par part).
 * Les téléchargements passent systématiquement par /api/firmware/serve pour éviter les soucis TLS R2 côté ESP32.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { FirmwareErrors } from '@/app/api/admin/firmware/errors';
import { isKidooModelId } from '@kidoo/shared';
import type { KidooModel } from '@kidoo/shared/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');
    const version = searchParams.get('version');
    const mac = searchParams.get('mac') ?? undefined;
    const v = version?.trim() ?? '';

    if (!model || !isKidooModelId(model)) {
      return createErrorResponse(FirmwareErrors.MODEL_INVALID, {
        message: 'Paramètre model requis et doit être un modèle valide (basic, dream, etc.)',
      });
    }

    if (!v) {
      return createErrorResponse(FirmwareErrors.VALIDATION_ERROR, {
        message: 'Paramètre version requis',
      });
    }

    const firmware = await prisma.firmware.findUnique({
      where: {
        model_version: {
          model: model as KidooModel,
          version: v,
        },
      },
      select: { version: true, path: true, partCount: true, fileSize: true },
    });

    if (!firmware) {
      return createErrorResponse(FirmwareErrors.NOT_FOUND, {
        message: `Aucun firmware pour model=${model} version=${v}`,
      });
    }

    const requestOrigin = request.nextUrl.origin;
    const isUnreachable =
      requestOrigin.includes('0.0.0.0') ||
      requestOrigin.startsWith('http://localhost') ||
      requestOrigin.startsWith('http://127.0.0.1');
    // L'ESP télécharge via /api/firmware/serve ; l'origine doit donc être joignable directement.
    // En dev (Postman sur 0.0.0.0 ou localhost), définir API_PUBLIC_ORIGIN=http://<IP_LAN>:3000
    // (ex. http://192.168.1.206:3000) dans .env pour que l'ESP dispose d'une URL accessible.
    let origin = requestOrigin;
    if (isUnreachable) {
      if (process.env.API_PUBLIC_ORIGIN) {
        origin = process.env.API_PUBLIC_ORIGIN.replace(/\/$/, '');
      } else {
        const host = request.headers.get('host') ?? '';
        const hostUnreachable =
          host.includes('0.0.0.0') || host.startsWith('localhost') || host.startsWith('127.0.0.1');
        if (!hostUnreachable && host) {
          const proto = request.headers.get('x-forwarded-proto') ?? 'http';
          origin = `${proto}://${host}`;
        }
      }
    }
    const macQ = mac?.trim() ? `&mac=${encodeURIComponent(mac.trim().replace(/[:-]/g, '').toUpperCase())}` : '';
    const buildServeUrl = (part?: number) => {
      const partQuery = part != null ? `&part=${part}` : '';
      return (
        `${origin}/api/firmware/serve?model=${encodeURIComponent(model)}&version=${encodeURIComponent(v)}` +
        partQuery +
        macQ
      );
    };

    const partCount = firmware.partCount ?? 1;

    if (partCount > 1) {
      const urls: string[] = Array.from({ length: partCount }, (_, i) => buildServeUrl(i));
      return createSuccessResponse({
        partCount,
        urls,
        totalSize: firmware.fileSize,
        version: firmware.version,
      });
    }

    const url = buildServeUrl();

    return createSuccessResponse({
      partCount: 1,
      url,
      totalSize: firmware.fileSize,
      version: firmware.version,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'URL firmware:', error);
    return createErrorResponse(FirmwareErrors.INTERNAL_ERROR, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
}
