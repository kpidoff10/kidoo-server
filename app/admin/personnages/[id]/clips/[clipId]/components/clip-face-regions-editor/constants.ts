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
