/**
 * GET /api/admin/clips/[id] - Récupère un clip par ID (avec emotion, character, faceRegions)
 * PATCH /api/admin/clips/[id] - Met à jour un clip (ex. loopStartFrame, faceRegions)
 */

import { prisma } from '@/lib/prisma';
import { FaceRegionKey, CornerStyle } from '@kidoo/shared/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/** Région normalisée 0-1 (x, y = coin supérieur gauche; w, h = largeur/hauteur) */
interface FaceRegionPayload {
  x: number;
  y: number;
  w: number;
  h: number;
  cornerStyle?: 'rounded' | 'square';
  /** URL de l'image masque (fond noir + région blanche) sur R2 */
  imageUrl?: string | null;
}

interface FaceRegionsPayload {
  leftEye?: FaceRegionPayload;
  rightEye?: FaceRegionPayload;
  mouth?: FaceRegionPayload;
}

const REGION_KEY_TO_API: Record<FaceRegionKey, keyof FaceRegionsPayload> = {
  [FaceRegionKey.LEFT_EYE]: 'leftEye',
  [FaceRegionKey.RIGHT_EYE]: 'rightEye',
  [FaceRegionKey.MOUTH]: 'mouth',
};

const CORNER_STYLE_TO_API: Record<CornerStyle, 'rounded' | 'square'> = {
  [CornerStyle.ROUNDED]: 'rounded',
  [CornerStyle.SQUARE]: 'square',
};

function buildFaceRegionsFromRelation(
  rows: Array<{
    regionKey: FaceRegionKey;
    frameIndex: number;
    x: number;
    y: number;
    w: number;
    h: number;
    cornerStyle?: CornerStyle;
    imageUrl?: string | null;
  }>
): FaceRegionsPayload {
  const out: FaceRegionsPayload = {};
  for (const row of rows) {
    const key = REGION_KEY_TO_API[row.regionKey];
    if (key) {
      out[key] = {
        x: row.x,
        y: row.y,
        w: row.w,
        h: row.h,
        cornerStyle: row.cornerStyle ? CORNER_STYLE_TO_API[row.cornerStyle] : 'rounded',
        imageUrl: row.imageUrl ?? null,
      };
    }
  }
  return out;
}

/** Groupe les lignes par frameIndex et construit faceRegionsByFrame */
function buildFaceRegionsByFrame(
  rows: Array<{
    regionKey: FaceRegionKey;
    frameIndex: number;
    x: number;
    y: number;
    w: number;
    h: number;
    cornerStyle?: CornerStyle;
    imageUrl?: string | null;
  }>
): Record<string, FaceRegionsPayload> {
  const byFrame: Record<
    number,
    Array<{
      regionKey: FaceRegionKey;
      x: number;
      y: number;
      w: number;
      h: number;
      cornerStyle?: CornerStyle;
      imageUrl?: string | null;
    }>
  > = {};
  for (const row of rows) {
    const fi = row.frameIndex;
    if (!byFrame[fi]) byFrame[fi] = [];
    byFrame[fi].push({
      regionKey: row.regionKey,
      x: row.x,
      y: row.y,
      w: row.w,
      h: row.h,
      cornerStyle: row.cornerStyle,
      imageUrl: row.imageUrl,
    });
  }
  const out: Record<string, FaceRegionsPayload> = {};
  for (const [fi, list] of Object.entries(byFrame)) {
    out[fi] = buildFaceRegionsFromRelation(list);
  }
  return out;
}

/** Payload d’un artefact (région nommée, ex. "zzz") */
interface ArtifactPayload {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cornerStyle?: 'rounded' | 'square';
  /** URL de l'image masque (fond noir + région blanche) sur R2 */
  imageUrl?: string | null;
}

/** Groupe les artefacts par frameIndex */
function buildArtifactsByFrame(
  rows: Array<{
    id: string;
    frameIndex: number;
    name: string;
    x: number;
    y: number;
    w: number;
    h: number;
    cornerStyle: CornerStyle;
    imageUrl?: string | null;
  }>
): Record<string, ArtifactPayload[]> {
  const byFrame: Record<number, ArtifactPayload[]> = {};
  for (const row of rows) {
    const fi = row.frameIndex;
    if (!byFrame[fi]) byFrame[fi] = [];
    byFrame[fi].push({
      id: row.id,
      name: row.name,
      x: row.x,
      y: row.y,
      w: row.w,
      h: row.h,
      cornerStyle: row.cornerStyle ? (row.cornerStyle === CornerStyle.SQUARE ? 'square' : 'rounded') : 'rounded',
      imageUrl: row.imageUrl ?? null,
    });
  }
  const out: Record<string, ArtifactPayload[]> = {};
  for (const [fi, list] of Object.entries(byFrame)) {
    out[fi] = list;
  }
  return out;
}

export const GET = withAdminAuth(
  async (_request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: clipId } = await params;

      const clip = await prisma.clip.findUnique({
        where: { id: clipId },
        include: {
          emotion: true,
          character: { select: { id: true, name: true, imageWidth: true, imageHeight: true } },
          faceRegions: true,
          artifacts: true,
        },
      });

      if (!clip) {
        return createErrorResponse('CLIP_NOT_FOUND', 404);
      }

      const { faceRegions: faceRegionsRows, artifacts: artifactsRows, ...rest } = clip;
      const faceRegionsByFrame = buildFaceRegionsByFrame(faceRegionsRows);
      const faceRegionsFrame0 = faceRegionsByFrame['0'];
      const faceRegions = faceRegionsFrame0 && Object.keys(faceRegionsFrame0).length > 0 ? faceRegionsFrame0 : null;
      const artifactsByFrame = buildArtifactsByFrame(artifactsRows);
      const withISO = {
        ...rest,
        faceRegions,
        faceRegionsByFrame: Object.keys(faceRegionsByFrame).length > 0 ? faceRegionsByFrame : null,
        artifactsByFrame: Object.keys(artifactsByFrame).length > 0 ? artifactsByFrame : null,
        createdAt: rest.createdAt.toISOString(),
        updatedAt: rest.updatedAt.toISOString(),
        emotion: {
          ...clip.emotion,
          createdAt: clip.emotion.createdAt.toISOString(),
          updatedAt: clip.emotion.updatedAt.toISOString(),
        },
      };
      return createSuccessResponse(withISO);
    } catch (error) {
      console.error('Erreur lors de la récupération du clip:', error);
      return createErrorResponse('INTERNAL_ERROR', 500, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);

const API_KEY_TO_REGION: Record<keyof FaceRegionsPayload, FaceRegionKey> = {
  leftEye: FaceRegionKey.LEFT_EYE,
  rightEye: FaceRegionKey.RIGHT_EYE,
  mouth: FaceRegionKey.MOUTH,
};

const API_CORNER_TO_DB: Record<'rounded' | 'square', CornerStyle> = {
  rounded: CornerStyle.ROUNDED,
  square: CornerStyle.SQUARE,
};

export const PATCH = withAdminAuth(
  async (request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: clipId } = await params;
      const body = (await request.json()) as {
        loopStartFrame?: number | null;
        loopEndFrame?: number | null;
        faceRegions?: FaceRegionsPayload | null;
        /** Régions par frame (clé = index de frame en string) */
        faceRegionsByFrame?: Record<string, FaceRegionsPayload> | null;
        /** Artefacts par frame (clé = index de frame en string) */
        artifactsByFrame?: Record<string, ArtifactPayload[]> | null;
      };

      const clip = await prisma.clip.findUnique({ where: { id: clipId } });
      if (!clip) {
        return createErrorResponse('CLIP_NOT_FOUND', 404);
      }

      const updateData: {
        loopStartFrame?: number | null;
        loopEndFrame?: number | null;
      } = {};
      if (body.loopStartFrame !== undefined) {
        updateData.loopStartFrame = body.loopStartFrame === null ? null : body.loopStartFrame;
      }
      if (body.loopEndFrame !== undefined) {
        updateData.loopEndFrame = body.loopEndFrame === null ? null : body.loopEndFrame;
      }

      const updated = await prisma.$transaction(async (tx) => {
        const clipUpdated = await tx.clip.update({
          where: { id: clipId },
          data: updateData,
          include: {
            emotion: true,
            character: { select: { id: true, name: true, imageWidth: true, imageHeight: true } },
          },
        });

        const regionsPayload = body.faceRegionsByFrame ?? (body.faceRegions != null ? { '0': body.faceRegions } : undefined);
        if (regionsPayload !== undefined) {
          await tx.clipFaceRegion.deleteMany({ where: { clipId } });
          if (regionsPayload !== null && typeof regionsPayload === 'object') {
            const toCreate: Array<{
              clipId: string;
              regionKey: FaceRegionKey;
              frameIndex: number;
              x: number;
              y: number;
              w: number;
              h: number;
              cornerStyle: CornerStyle;
            }> = [];
            for (const [frameIndexStr, regions] of Object.entries(regionsPayload)) {
              const frameIndex = parseInt(frameIndexStr, 10);
              if (Number.isNaN(frameIndex) || !regions || typeof regions !== 'object') continue;
              for (const apiKey of ['leftEye', 'rightEye', 'mouth'] as const) {
                const region = regions[apiKey];
                if (region) {
                  const cornerStyle =
                    region.cornerStyle && region.cornerStyle in API_CORNER_TO_DB
                      ? API_CORNER_TO_DB[region.cornerStyle as 'rounded' | 'square']
                      : CornerStyle.ROUNDED;
                  toCreate.push({
                    clipId,
                    regionKey: API_KEY_TO_REGION[apiKey],
                    frameIndex,
                    x: region.x,
                    y: region.y,
                    w: region.w,
                    h: region.h,
                    cornerStyle,
                  });
                }
              }
            }
            if (toCreate.length > 0) {
              await tx.clipFaceRegion.createMany({ data: toCreate });
            }
          }
        }

        const artifactsPayload = body.artifactsByFrame;
        if (artifactsPayload !== undefined) {
          await tx.clipArtifact.deleteMany({ where: { clipId } });
          if (artifactsPayload !== null && typeof artifactsPayload === 'object') {
            const toCreate: Array<{
              clipId: string;
              frameIndex: number;
              name: string;
              x: number;
              y: number;
              w: number;
              h: number;
              cornerStyle: CornerStyle;
            }> = [];
            for (const [frameIndexStr, list] of Object.entries(artifactsPayload)) {
              const frameIndex = parseInt(frameIndexStr, 10);
              if (Number.isNaN(frameIndex) || !Array.isArray(list)) continue;
              for (const art of list) {
                if (!art || typeof art.name !== 'string') continue;
                const cornerStyle =
                  art.cornerStyle === 'square' ? CornerStyle.SQUARE : CornerStyle.ROUNDED;
                toCreate.push({
                  clipId,
                  frameIndex,
                  name: art.name.trim() || 'artefact',
                  x: art.x,
                  y: art.y,
                  w: art.w,
                  h: art.h,
                  cornerStyle,
                });
              }
            }
            if (toCreate.length > 0) {
              await tx.clipArtifact.createMany({ data: toCreate });
            }
          }
        }

        const withRegions = await tx.clip.findUnique({
          where: { id: clipId },
          include: {
            emotion: true,
            character: { select: { id: true, name: true, imageWidth: true, imageHeight: true } },
            faceRegions: true,
            artifacts: true,
          },
        });
        return withRegions!;
      });

      const { faceRegions: faceRegionsRows, artifacts: artifactsRows, ...rest } = updated;
      const faceRegionsByFrame = buildFaceRegionsByFrame(faceRegionsRows);
      const faceRegionsFrame0 = faceRegionsByFrame['0'];
      const faceRegions = faceRegionsFrame0 && Object.keys(faceRegionsFrame0).length > 0 ? faceRegionsFrame0 : null;
      const artifactsByFrame = buildArtifactsByFrame(artifactsRows);
      const withISO = {
        ...rest,
        faceRegions,
        faceRegionsByFrame: Object.keys(faceRegionsByFrame).length > 0 ? faceRegionsByFrame : null,
        artifactsByFrame: Object.keys(artifactsByFrame).length > 0 ? artifactsByFrame : null,
        createdAt: rest.createdAt.toISOString(),
        updatedAt: rest.updatedAt.toISOString(),
        emotion: {
          ...updated.emotion,
          createdAt: updated.emotion.createdAt.toISOString(),
          updatedAt: updated.emotion.updatedAt.toISOString(),
        },
      };
      return createSuccessResponse(withISO);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du clip:', error);
      return createErrorResponse('INTERNAL_ERROR', 500, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);
