/**
 * GET /api/firmware/serve?model=dream&version=1.0.4&mac=AABBCCDDEEFF
 * Diffuse le binaire firmware en stream (URL courte pour l'ESP32 OTA).
 * Le paramètre mac est accepté (ESP l'envoie) mais n'est plus utilisé.
 */

import { Readable } from 'node:stream';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFirmwareStream } from '@/lib/r2';
import { isKidooModelId } from '@kidoo/shared';
import type { KidooModel } from '@kidoo/shared/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');
    const version = searchParams.get('version');

    if (!model || !isKidooModelId(model) || !version?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Paramètres model et version requis' },
        { status: 400 }
      );
    }

    const firmware = await prisma.firmware.findUnique({
      where: {
        model_version: {
          model: model as KidooModel,
          version: version.trim(),
        },
      },
      select: { path: true },
    });

    if (!firmware) {
      return NextResponse.json(
        { success: false, error: `Aucun firmware pour model=${model} version=${version}` },
        { status: 404 }
      );
    }

    const { Body, ContentLength } = await getFirmwareStream(firmware.path);

    const nodeStream = Body as NodeJS.ReadableStream;
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

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
