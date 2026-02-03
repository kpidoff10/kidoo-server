/**
 * GET /api/firmware/serve?model=dream&version=1.0.4&part=0
 * Diffuse le binaire firmware (ou une part) en stream (URL courte pour l'ESP32 OTA).
 * part : optionnel, index de la part (0, 1, ...) quand partCount > 1.
 */

import { Readable } from 'node:stream';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFirmwareStream, getFirmwarePartPath } from '@/lib/r2';
import { isKidooModelId } from '@kidoo/shared';
import type { KidooModel } from '@kidoo/shared/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');
    const version = searchParams.get('version')?.trim();
    const partParam = searchParams.get('part');

    if (!model || !isKidooModelId(model) || !version) {
      return NextResponse.json(
        { success: false, error: 'Paramètres model et version requis' },
        { status: 400 }
      );
    }

    const firmware = await prisma.firmware.findUnique({
      where: {
        model_version: {
          model: model as KidooModel,
          version,
        },
      },
      select: { path: true, partCount: true },
    });

    if (!firmware) {
      return NextResponse.json(
        { success: false, error: `Aucun firmware pour model=${model} version=${version}` },
        { status: 404 }
      );
    }

    const partCount = firmware.partCount ?? 1;
    let path: string;
    if (partCount > 1) {
      const partIndex = partParam != null ? parseInt(partParam, 10) : 0;
      if (Number.isNaN(partIndex) || partIndex < 0 || partIndex >= partCount) {
        return NextResponse.json(
          { success: false, error: `Paramètre part doit être entre 0 et ${partCount - 1}` },
          { status: 400 }
        );
      }
      path = getFirmwarePartPath(model, version, partIndex);
    } else {
      path = firmware.path;
    }

    const { Body, ContentLength } = await getFirmwareStream(path);

    if (!Body) {
      return NextResponse.json(
        { success: false, error: 'Flux firmware manquant' },
        { status: 500 }
      );
    }

    let webStream: ReadableStream<Uint8Array>;
    if (Body instanceof Readable) {
      webStream = Readable.toWeb(Body as Readable) as ReadableStream<Uint8Array>;
    } else if (Body instanceof ReadableStream) {
      webStream = Body as ReadableStream<Uint8Array>;
    } else {
      console.error('[Firmware serve] Type de flux non pris en charge:', typeof Body);
      return NextResponse.json(
        { success: false, error: 'Type de flux non pris en charge' },
        { status: 500 }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
    };
    if (ContentLength != null) {
      headers['Content-Length'] = String(ContentLength);
    }

    return new NextResponse(webStream, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Erreur serve firmware:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du téléchargement du firmware' },
      { status: 500 }
    );
  }
}
