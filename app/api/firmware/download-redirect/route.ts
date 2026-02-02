/**
 * GET /api/firmware/download-redirect?model=dream&version=1.0.3
 * Redirige vers l'URL signée du binaire (pour le lien "Télécharger" de l'admin).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFirmwareDownloadUrl } from '@/lib/r2';
import { isKidooModelId } from '@kidoo/shared';
import type { KidooModel } from '@kidoo/shared/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');
    const version = searchParams.get('version');

    if (!model || !isKidooModelId(model) || !version?.trim()) {
      return NextResponse.json(
        { error: 'Paramètres model et version requis' },
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
        { error: `Aucun firmware pour model=${model} version=${version}` },
        { status: 404 }
      );
    }

    const url = await getFirmwareDownloadUrl(firmware.path, 3600);
    return NextResponse.redirect(url, 302);
  } catch (error) {
    console.error('Erreur download-redirect firmware:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du lien de téléchargement' },
      { status: 500 }
    );
  }
}
