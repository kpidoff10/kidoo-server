'use client';

import { forwardRef } from 'react';
import type { FaceRegions, ArtifactRegion } from '../../../../../../lib/charactersApi';
import type { RegionKey } from './constants';
import {
  REGION_LABELS,
  REGION_BORDERS,
  REGION_COLORS,
  ARTIFACT_COLOR,
  ARTIFACT_BORDER,
  ensureCornerStyle,
} from './constants';

export interface RegionOverlayProps {
  regions: FaceRegions;
  currentArtifacts: ArtifactRegion[];
  onFaceRegionPointerDown: (e: React.PointerEvent, key: RegionKey, mode: 'move' | 'resize') => void;
  onArtifactPointerDown: (e: React.PointerEvent, index: number, mode: 'move' | 'resize') => void;
  onSetFaceCornerStyle: (key: RegionKey, style: 'rounded' | 'square') => void;
  onSetArtifactCornerStyle: (index: number, style: 'rounded' | 'square') => void;
  onRemoveArtifact: (index: number) => void;
}

export const RegionOverlay = forwardRef<HTMLDivElement, RegionOverlayProps>(
  (
    {
      regions,
      currentArtifacts,
      onFaceRegionPointerDown,
      onArtifactPointerDown,
      onSetFaceCornerStyle,
      onSetArtifactCornerStyle,
      onRemoveArtifact,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className="absolute inset-0 rounded"
        style={{ pointerEvents: 'auto' }}
      >
        {(['leftEye', 'rightEye', 'mouth'] as const).map((key) => {
          const r = regions[key];
          if (!r) return null;
          const isRounded = ensureCornerStyle(r) === 'rounded';
          return (
            <div
              key={key}
              className="absolute cursor-move border-2"
              style={{
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.w * 100}%`,
                height: `${r.h * 100}%`,
                backgroundColor: REGION_COLORS[key],
                borderColor: REGION_BORDERS[key],
                borderRadius: isRounded ? '15%' : 0,
              }}
              onPointerDown={(e) => onFaceRegionPointerDown(e, key, 'move')}
            >
              <div className="absolute -top-7 left-0 flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetFaceCornerStyle(key, 'rounded');
                  }}
                  title="Coins arrondis"
                  className={`flex h-6 w-6 items-center justify-center rounded border border-white/60 bg-black/50 transition-opacity hover:bg-black/70 ${
                    isRounded ? 'opacity-100 ring-1 ring-white' : 'opacity-60'
                  }`}
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="h-3.5 w-3.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="2" y="2" width="12" height="12" rx="3" ry="3" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetFaceCornerStyle(key, 'square');
                  }}
                  title="Coins carrés"
                  className={`flex h-6 w-6 items-center justify-center rounded border border-white/60 bg-black/50 transition-opacity hover:bg-black/70 ${
                    !isRounded ? 'opacity-100 ring-1 ring-white' : 'opacity-60'
                  }`}
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="h-3.5 w-3.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="2" y="2" width="12" height="12" />
                  </svg>
                </button>
                <span className="text-xs font-medium text-white drop-shadow">
                  {REGION_LABELS[key]}
                </span>
              </div>
              <div
                className="absolute bottom-0 right-0 z-10 h-5 w-5 cursor-se-resize border-r-2 border-b-2 border-white bg-white/20"
                style={{
                  borderColor: REGION_BORDERS[key],
                  borderRadius: isRounded ? '0 0 6px 0' : 0,
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onFaceRegionPointerDown(e, key, 'resize');
                }}
              />
            </div>
          );
        })}
        {currentArtifacts.map((art, idx) => {
          const isRounded = (art.cornerStyle ?? 'rounded') === 'rounded';
          return (
            <div
              key={idx}
              className="absolute cursor-move border-2"
              style={{
                left: `${art.x * 100}%`,
                top: `${art.y * 100}%`,
                width: `${art.w * 100}%`,
                height: `${art.h * 100}%`,
                backgroundColor: ARTIFACT_COLOR,
                borderColor: ARTIFACT_BORDER,
                borderRadius: isRounded ? '15%' : 0,
              }}
              onPointerDown={(e) => onArtifactPointerDown(e, idx, 'move')}
            >
              <div className="absolute -top-7 left-0 flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetArtifactCornerStyle(idx, 'rounded');
                  }}
                  title="Coins arrondis"
                  className={`flex h-6 w-6 items-center justify-center rounded border border-white/60 bg-black/50 ${
                    isRounded ? 'opacity-100 ring-1 ring-white' : 'opacity-60'
                  }`}
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="h-3.5 w-3.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="2" y="2" width="12" height="12" rx="3" ry="3" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetArtifactCornerStyle(idx, 'square');
                  }}
                  title="Coins carrés"
                  className={`flex h-6 w-6 items-center justify-center rounded border border-white/60 bg-black/50 ${
                    !isRounded ? 'opacity-100 ring-1 ring-white' : 'opacity-60'
                  }`}
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="h-3.5 w-3.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="2" y="2" width="12" height="12" />
                  </svg>
                </button>
                <span
                  className="max-w-[120px] truncate text-xs font-medium text-white drop-shadow"
                  title={art.name}
                >
                  {art.name || 'Sans nom'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveArtifact(idx);
                  }}
                  title="Supprimer l'artefact"
                  className="flex h-6 w-6 items-center justify-center rounded border border-red-400/80 bg-red-900/50 text-white hover:bg-red-900/70"
                >
                  ×
                </button>
              </div>
              <div
                className="absolute bottom-0 right-0 z-10 h-5 w-5 cursor-se-resize border-r-2 border-b-2 border-white bg-white/20"
                style={{
                  borderColor: ARTIFACT_BORDER,
                  borderRadius: isRounded ? '0 0 6px 0' : 0,
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onArtifactPointerDown(e, idx, 'resize');
                }}
              />
            </div>
          );
        })}
      </div>
    );
  }
);

RegionOverlay.displayName = 'RegionOverlay';
