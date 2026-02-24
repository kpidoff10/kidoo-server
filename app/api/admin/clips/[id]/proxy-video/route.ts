/**
 * GET /api/admin/clips/[id]/proxy-video
 * Proxie la vidéo preview du clip pour éviter CORS lors de l'extraction Canvas côté client.
 * Supporte les requêtes Range (nécessaire pour le seek vidéo).
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';

export const GET = withAdminAuth(
  async (request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id: clipId } = await params;
    const clip = await prisma.clip.findUnique({
      where: { id: clipId },
      select: { workingPreviewUrl: true, previewUrl: true },
    });
    const videoUrl = clip?.workingPreviewUrl ?? clip?.previewUrl;
    if (!videoUrl) {
      return new NextResponse('Vidéo introuvable', { status: 404 });
    }

    const rangeHeader = request.headers.get('range');
    const fetchHeaders: HeadersInit = {};
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const res = await fetch(videoUrl, { headers: fetchHeaders });
    if (!res.ok) {
      return new NextResponse('Échec du chargement de la vidéo', { status: 502 });
    }

    const headers = new Headers();
    const contentType = res.headers.get('content-type');
    if (contentType) headers.set('content-type', contentType);
    headers.set('cache-control', 'private, max-age=60');
    headers.set('Accept-Ranges', 'bytes');

    if (res.status === 206) {
      headers.set('content-range', res.headers.get('content-range') ?? '');
      const contentLength = res.headers.get('content-length');
      if (contentLength) headers.set('content-length', contentLength);
      return new NextResponse(res.body, { status: 206, headers });
    }

    const contentLength = res.headers.get('content-length');
    if (contentLength) headers.set('content-length', contentLength);
    return new NextResponse(res.body, { status: 200, headers });
  }
);
