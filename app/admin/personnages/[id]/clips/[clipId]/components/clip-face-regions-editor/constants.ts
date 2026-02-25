import type { FaceRegion, FaceRegions } from '../../../../../../lib/charactersApi';

export type RegionKey = 'leftEye' | 'rightEye' | 'mouth';

export const DEFAULT_LEFT_EYE: FaceRegion = {
  x: 0.22,
  y: 0.28,
  w: 0.18,
  h: 0.14,
  cornerStyle: 'square',
};
export const DEFAULT_RIGHT_EYE: FaceRegion = {
  x: 0.6,
  y: 0.28,
  w: 0.18,
  h: 0.14,
  cornerStyle: 'square',
};
export const DEFAULT_MOUTH: FaceRegion = {
  x: 0.38,
  y: 0.58,
  w: 0.24,
  h: 0.12,
  cornerStyle: 'square',
};

export function getDefaultRegions(): FaceRegions {
  return {
    leftEye: { ...DEFAULT_LEFT_EYE },
    rightEye: { ...DEFAULT_RIGHT_EYE },
    mouth: { ...DEFAULT_MOUTH },
  };
}

export type CornerStyle = 'rounded' | 'square';

export function ensureCornerStyle(r: FaceRegion): CornerStyle {
  return r.cornerStyle === 'square' ? 'square' : 'rounded';
}

const IMAGE_EXT = /\.(jpg|jpeg|png|webp|gif)$/i;
export function isImageUrl(url: string): boolean {
  try {
    return IMAGE_EXT.test(new URL(url).pathname);
  } catch {
    return IMAGE_EXT.test(url);
  }
}

export const REGION_LABELS: Record<RegionKey, string> = {
  leftEye: 'Œil gauche',
  rightEye: 'Œil droit',
  mouth: 'Bouche',
};

export const REGION_COLORS: Record<RegionKey, string> = {
  leftEye: 'rgba(59, 130, 246, 0.35)',
  rightEye: 'rgba(34, 197, 94, 0.35)',
  mouth: 'rgba(234, 179, 8, 0.35)',
};

export const REGION_BORDERS: Record<RegionKey, string> = {
  leftEye: 'rgb(59, 130, 246)',
  rightEye: 'rgb(34, 197, 94)',
  mouth: 'rgb(234, 179, 8)',
};

export const ARTIFACT_COLOR = 'rgba(147, 51, 234, 0.4)';
export const ARTIFACT_BORDER = 'rgb(147, 51, 234)';

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Clamp une région pour que x+w <= 1 et y+h <= 1 (corrige les débordements existants en BDD) */
export function clampRegion(r: FaceRegion): FaceRegion {
  const w = Math.max(0.02, Math.min(1, r.w));
  const h = Math.max(0.02, Math.min(1, r.h));
  const x = Math.max(0, Math.min(1 - w, r.x));
  const y = Math.max(0, Math.min(1 - h, r.y));
  return { ...r, x, y, w, h };
}

/** Clamp les 3 régions d'un FaceRegions */
export function clampFaceRegions(regions: FaceRegions): FaceRegions {
  return {
    leftEye: regions.leftEye ? clampRegion(regions.leftEye) : undefined,
    rightEye: regions.rightEye ? clampRegion(regions.rightEye) : undefined,
    mouth: regions.mouth ? clampRegion(regions.mouth) : undefined,
  };
}

/** Clamp un artefact pour que x+w <= 1 et y+h <= 1 */
export function clampArtifact(a: { x: number; y: number; w: number; h: number }): { x: number; y: number; w: number; h: number } {
  const w = Math.max(0.05, Math.min(1, a.w));
  const h = Math.max(0.05, Math.min(1, a.h));
  const x = Math.max(0, Math.min(1 - w, a.x));
  const y = Math.max(0, Math.min(1 - h, a.y));
  return { ...a, x, y, w, h };
}

/** Marge d'expansion (8%) pour aligner l'aperçu avec la génération - évite coupures sur objets animés */
const REGION_EXPANSION = 0.08;

/** Étend une région pour l'affichage (même logique que generate-region-images) */
export function expandRegionForPreview(r: { x: number; y: number; w: number; h: number }): { x: number; y: number; w: number; h: number } {
  const m = REGION_EXPANSION;
  const x2 = Math.max(0, r.x - m * r.w);
  const y2 = Math.max(0, r.y - m * r.h);
  const w2 = Math.min(1 - x2, r.w * (1 + 2 * m));
  const h2 = Math.min(1 - y2, r.h * (1 + 2 * m));
  return { x: x2, y: y2, w: w2, h: h2 };
}
