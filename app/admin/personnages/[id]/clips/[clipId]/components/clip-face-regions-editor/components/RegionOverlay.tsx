'use client';

import { forwardRef } from 'react';
import type { FaceRegions, ArtifactRegion } from '@/app/admin/lib/charactersApi';
import type { RegionKey } from '../constants';
import {
  REGION_LABELS,
  REGION_BORDERS,
  REGION_COLORS,
  ARTIFACT_COLOR,
  ARTIFACT_BORDER,
} from '../constants';

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

export interface RegionOverlayProps {
  regions: FaceRegions;
  currentArtifacts: ArtifactRegion[];
  onFaceRegionPointerDown: (e: React.PointerEvent, key: RegionKey, mode: 'move' | 'resize', handle?: ResizeHandle) => void;
  onArtifactPointerDown: (e: React.PointerEvent, index: number, mode: 'move' | 'resize', handle?: ResizeHandle) => void;
  onRemoveArtifact: (index: number) => void;
}

export const RegionOverlay = forwardRef<HTMLDivElement, RegionOverlayProps>(
  (
    {
      regions,
      currentArtifacts,
      onFaceRegionPointerDown,
      onArtifactPointerDown,
      onRemoveArtifact,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className="absolute inset-0 overflow-visible rounded"
        style={{ pointerEvents: 'auto' }}
      >
        {(['leftEye', 'rightEye', 'mouth'] as const).map((key) => {
          const r = regions[key];
          if (!r) return null;
          return (
            <div
              key={key}
              className="absolute cursor-move overflow-visible border-2"
              style={{
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.w * 100}%`,
                height: `${r.h * 100}%`,
                backgroundColor: REGION_COLORS[key],
                borderColor: REGION_BORDERS[key],
              }}
              onPointerDown={(e) => onFaceRegionPointerDown(e, key, 'move')}
            >
              <div className="absolute -top-7 left-0 flex items-center gap-1">
                <span className="text-xs font-medium text-white drop-shadow">
                  {REGION_LABELS[key]}
                </span>
              </div>
              {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => (
                <div
                  key={handle}
                  className="absolute z-10 h-3 w-3"
                  style={{
                    borderWidth: 0,
                    borderColor: REGION_BORDERS[key],
                    cursor: `${handle}-resize`,
                    ...(handle === 'nw' && {
                      top: -10,
                      left: -10,
                      borderTopWidth: 2,
                      borderLeftWidth: 2,
                    }),
                    ...(handle === 'ne' && {
                      top: -10,
                      right: -10,
                      borderTopWidth: 2,
                      borderRightWidth: 2,
                    }),
                    ...(handle === 'sw' && {
                      bottom: -10,
                      left: -10,
                      borderBottomWidth: 2,
                      borderLeftWidth: 2,
                    }),
                    ...(handle === 'se' && {
                      bottom: -10,
                      right: -10,
                      borderBottomWidth: 2,
                      borderRightWidth: 2,
                    }),
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onFaceRegionPointerDown(e, key, 'resize', handle);
                  }}
                />
              ))}
            </div>
          );
        })}
        {currentArtifacts.map((art, idx) => (
          <div
            key={idx}
            className="absolute cursor-move overflow-visible border-2"
            style={{
              left: `${art.x * 100}%`,
              top: `${art.y * 100}%`,
              width: `${art.w * 100}%`,
              height: `${art.h * 100}%`,
              backgroundColor: ARTIFACT_COLOR,
              borderColor: ARTIFACT_BORDER,
            }}
            onPointerDown={(e) => onArtifactPointerDown(e, idx, 'move')}
          >
            <div className="absolute -top-7 left-0 flex items-center gap-1">
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
            {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => (
              <div
                key={handle}
                className="absolute z-10 h-3 w-3"
                style={{
                  borderWidth: 0,
                  borderColor: ARTIFACT_BORDER,
                  cursor: `${handle}-resize`,
                  ...(handle === 'nw' && {
                    top: -10,
                    left: -10,
                    borderTopWidth: 2,
                    borderLeftWidth: 2,
                  }),
                  ...(handle === 'ne' && {
                    top: -10,
                    right: -10,
                    borderTopWidth: 2,
                    borderRightWidth: 2,
                  }),
                  ...(handle === 'sw' && {
                    bottom: -10,
                    left: -10,
                    borderBottomWidth: 2,
                    borderLeftWidth: 2,
                  }),
                  ...(handle === 'se' && {
                    bottom: -10,
                    right: -10,
                    borderBottomWidth: 2,
                    borderRightWidth: 2,
                  }),
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onArtifactPointerDown(e, idx, 'resize', handle);
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }
);

RegionOverlay.displayName = 'RegionOverlay';
