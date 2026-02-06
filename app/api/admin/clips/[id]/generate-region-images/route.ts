/**
 * POST /api/admin/clips/[id]/generate-region-images
 * Extrait le contenu réel de la vidéo pour chaque (frame, région) et (frame, artefact) :
 * pour chaque frame concernée on extrait la frame vidéo, puis on recadre chaque région/artefact
 * et on enregistre l'image sur R2 + URL en BDD.
 *
 * Format : PNG pleine frame à la résolution cible (clip.width x clip.height), fond transparent,
 * contenu à la bonne position. Même scale+pad que le transcodage vidéo pour éviter tout décalage.
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { extractRegionWithTransparentBackground } from '@/lib/regionMaskImage';
import { extractFrameAt } from '@/lib/extractFrameFromVideo';
import { getVideoMetadata } from '@/lib/getVideoMetadata';
import { uploadClipFile } from '@/lib/r2';
import { FaceRegionKey, CornerStyle } from '@kidoo/shared/prisma';
import sharp from 'sharp';

const TARGET_WIDTH = 240;
const TARGET_HEIGHT = 280;

/**
 * Applique le même scale+pad que clipWorker (ffmpeg force_original_aspect_ratio=decrease, pad).
 * Retourne un buffer PNG aux dimensions targetW x targetH.
 */
async function scaleFrameToTarget(
  frameBuffer: Buffer,
  frameWidth: number,
  frameHeight: number,
  targetW: number,
  targetH: number
): Promise<Buffer> {
  return sharp(frameBuffer)
    .resize(targetW, targetH, {
      fit: 'contain',
      position: 'center',
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .png()
    .toBuffer();
}

const REGION_ORDER: FaceRegionKey[] = [
  FaceRegionKey.LEFT_EYE,
  FaceRegionKey.RIGHT_EYE,
  FaceRegionKey.MOUTH,
];

function cornerStyleToApi(c: CornerStyle): 'rounded' | 'square' {
  return c === CornerStyle.SQUARE ? 'square' : 'rounded';
}

/** Expansion des régions (~8% par côté) pour objets animés (balle rebondissante, etc.) */
const REGION_EXPANSION = 0.08;

function expandRegion(x: number, y: number, w: number, h: number): { x: number; y: number; w: number; h: number } {
  if (REGION_EXPANSION <= 0) return { x, y, w, h };
  const m = REGION_EXPANSION;
  let x2 = Math.max(0, x - m * w);
  let y2 = Math.max(0, y - m * h);
  let w2 = Math.min(1 - x2, w * (1 + 2 * m));
  let h2 = Math.min(1 - y2, h * (1 + 2 * m));
  return { x: x2, y: y2, w: w2, h: h2 };
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

      const effectivePreviewUrl = clip.workingPreviewUrl ?? clip.previewUrl;
      if (!effectivePreviewUrl) {
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

      const targetW = clip.width ?? TARGET_WIDTH;
      const targetH = clip.height ?? TARGET_HEIGHT;

      // Récupérer le FPS réel de la vidéo pour un timing correct (évite décalage si clip.fps ≠ vidéo)
      let fps = clip.fps ?? 10;
      try {
        const meta = await getVideoMetadata(effectivePreviewUrl, fps);
        if (meta.fps > 0) fps = meta.fps;
      } catch {
        // Garder clip.fps en fallback
      }

      for (const frameIndex of sortedFrameIndices) {
        const frameBuffer = await extractFrameAt(effectivePreviewUrl, frameIndex, fps);
        const meta = await sharp(frameBuffer).metadata();
        const frameWidth = meta.width ?? clip.width ?? TARGET_WIDTH;
        const frameHeight = meta.height ?? clip.height ?? TARGET_HEIGHT;

        // Scale frame à la résolution cible (même scale+pad que transcodage vidéo) pour alignement parfait
        const scaledFrameBuffer = await scaleFrameToTarget(
          frameBuffer,
          frameWidth,
          frameHeight,
          targetW,
          targetH
        );

        // Transformer les coords normalisées (0-1 de la vidéo source) vers l'espace de la frame scalée
        const scale = Math.min(targetW / frameWidth, targetH / frameHeight);
        const scaledW = frameWidth * scale;
        const scaledH = frameHeight * scale;
        const padLeft = (targetW - scaledW) / 2;
        const padTop = (targetH - scaledH) / 2;

        const regionShapeForScaled = (
          r: { x: number; y: number; w: number; h: number; cornerStyle: CornerStyle },
          expand = true
        ) => {
          const x = (padLeft + r.x * scaledW) / targetW;
          const y = (padTop + r.y * scaledH) / targetH;
          const w = (r.w * scaledW) / targetW;
          const h = (r.h * scaledH) / targetH;
          const { x: xe, y: ye, w: we, h: he } = expand ? expandRegion(x, y, w, h) : { x, y, w, h };
          return { x: xe, y: ye, w: we, h: he, cornerStyle: cornerStyleToApi(r.cornerStyle) };
        };

        const cacheBust = Date.now();

        for (const row of regionsByFrame.get(frameIndex) ?? []) {
          const pngBuffer = await extractRegionWithTransparentBackground(
            scaledFrameBuffer,
            targetW,
            targetH,
            regionShapeForScaled(row)
          );
          const fileName = `regions/frame-${frameIndex}-${row.regionKey}.png`;
          const baseUrl = await uploadClipFile(clipId, fileName, pngBuffer, 'image/png');
          const imageUrl = `${baseUrl.split('?')[0]}?v=${cacheBust}`;
          await prisma.clipFaceRegion.update({ where: { id: row.id }, data: { imageUrl } });
          generatedRegions.push({ frameIndex, regionKey: row.regionKey, imageUrl });
        }

        for (const row of artifactsByFrame.get(frameIndex) ?? []) {
          const pngBuffer = await extractRegionWithTransparentBackground(
            scaledFrameBuffer,
            targetW,
            targetH,
            regionShapeForScaled(row)
          );
          const fileName = `artifacts/frame-${frameIndex}-${row.id}.png`;
          const baseUrl = await uploadClipFile(clipId, fileName, pngBuffer, 'image/png');
          const imageUrl = `${baseUrl.split('?')[0]}?v=${cacheBust}`;
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
