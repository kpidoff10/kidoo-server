/**
 * POST /api/admin/clips/[id]/generate-region-images
 * Extrait le contenu réel de la vidéo pour chaque (frame, région) et (frame, artefact) :
 * pour chaque frame concernée on extrait la frame vidéo, puis on recadre chaque région/artefact
 * et on enregistre l'image sur R2 + URL en BDD.
 *
 * Format : PNG pleine frame (taille vidéo), fond transparent, contenu de la région à la bonne position.
 * Idéal pour superposer plusieurs régions (draw à 0,0).
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { extractRegionWithTransparentBackground } from '@/lib/regionMaskImage';
import { extractFrameAt } from '@/lib/extractFrameFromVideo';
import { uploadClipFile } from '@/lib/r2';
import { FaceRegionKey, CornerStyle } from '@kidoo/shared/prisma';
import sharp from 'sharp';

const REGION_ORDER: FaceRegionKey[] = [
  FaceRegionKey.LEFT_EYE,
  FaceRegionKey.RIGHT_EYE,
  FaceRegionKey.MOUTH,
];

function cornerStyleToApi(c: CornerStyle): 'rounded' | 'square' {
  return c === CornerStyle.SQUARE ? 'square' : 'rounded';
}

export const POST = withAdminAuth(
  async (request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: clipId } = await params;

      const clip = await prisma.clip.findUnique({
        where: { id: clipId },
        include: { faceRegions: true, artifacts: true },
      });

      if (!clip) {
        return createErrorResponse('CLIP_NOT_FOUND', 404);
      }

      if (!clip.previewUrl) {
        return createErrorResponse('VALIDATION_ERROR', 400, {
          message: 'Le clip n\'a pas de preview (vidéo) pour extraire les frames.',
        });
      }

      const generatedRegions: Array<{ frameIndex: number; regionKey: string; imageUrl: string }> = [];
      const generatedArtifacts: Array<{ frameIndex: number; artifactId: string; name: string; imageUrl: string }> = [];

      // Frame indices uniques (régions + artefacts)
      const frameIndices = new Set<number>();
      for (const r of clip.faceRegions) frameIndices.add(r.frameIndex);
      for (const a of clip.artifacts) frameIndices.add(a.frameIndex);
      const sortedFrameIndices = [...frameIndices].sort((a, b) => a - b);

      const regionsByFrame = new Map<number, typeof clip.faceRegions>();
      for (const r of clip.faceRegions) {
        if (!regionsByFrame.has(r.frameIndex)) regionsByFrame.set(r.frameIndex, []);
        regionsByFrame.get(r.frameIndex)!.push(r);
      }
      for (const list of regionsByFrame.values()) {
        list.sort((a, b) => REGION_ORDER.indexOf(a.regionKey) - REGION_ORDER.indexOf(b.regionKey));
      }

      const artifactsByFrame = new Map<number, typeof clip.artifacts>();
      for (const a of clip.artifacts) {
        if (!artifactsByFrame.has(a.frameIndex)) artifactsByFrame.set(a.frameIndex, []);
        artifactsByFrame.get(a.frameIndex)!.push(a);
      }
      for (const list of artifactsByFrame.values()) {
        list.sort((a, b) => a.id.localeCompare(b.id));
      }

      for (const frameIndex of sortedFrameIndices) {
        const frameBuffer = await extractFrameAt(clip.previewUrl, frameIndex);
        const meta = await sharp(frameBuffer).metadata();
        const frameWidth = meta.width ?? clip.width ?? 240;
        const frameHeight = meta.height ?? clip.height ?? 280;

        const regionShape = (r: { x: number; y: number; w: number; h: number; cornerStyle: CornerStyle }) => ({
          x: r.x,
          y: r.y,
          w: r.w,
          h: r.h,
          cornerStyle: cornerStyleToApi(r.cornerStyle),
        });

        for (const row of regionsByFrame.get(frameIndex) ?? []) {
          const pngBuffer = await extractRegionWithTransparentBackground(
            frameBuffer,
            frameWidth,
            frameHeight,
            regionShape(row)
          );
          const fileName = `regions/frame-${frameIndex}-${row.regionKey}.png`;
          const imageUrl = await uploadClipFile(clipId, fileName, pngBuffer, 'image/png');
          await prisma.clipFaceRegion.update({ where: { id: row.id }, data: { imageUrl } });
          generatedRegions.push({ frameIndex, regionKey: row.regionKey, imageUrl });
        }

        for (const row of artifactsByFrame.get(frameIndex) ?? []) {
          const pngBuffer = await extractRegionWithTransparentBackground(
            frameBuffer,
            frameWidth,
            frameHeight,
            regionShape(row)
          );
          const fileName = `artifacts/frame-${frameIndex}-${row.id}.png`;
          const imageUrl = await uploadClipFile(clipId, fileName, pngBuffer, 'image/png');
          await prisma.clipArtifact.update({ where: { id: row.id }, data: { imageUrl } });
          generatedArtifacts.push({ frameIndex, artifactId: row.id, name: row.name, imageUrl });
        }
      }

      const total = generatedRegions.length + generatedArtifacts.length;
      return createSuccessResponse({
        message: `${total} image(s) extraite(s) du contenu vidéo (${generatedRegions.length} région(s), ${generatedArtifacts.length} artefact(s)).`,
        generatedRegions,
        generatedArtifacts,
      });
    } catch (error) {
      console.error('Erreur génération images régions:', error);
      return createErrorResponse('INTERNAL_ERROR', 500, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);
