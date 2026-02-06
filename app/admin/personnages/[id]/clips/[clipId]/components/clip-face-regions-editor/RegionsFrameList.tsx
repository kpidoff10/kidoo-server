'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { FaceRegions, ArtifactRegion } from '../../../../../../lib/charactersApi';
import type { RegionKey } from './constants';
import {
  REGION_LABELS,
  REGION_COLORS,
  REGION_BORDERS,
  ARTIFACT_COLOR,
  ARTIFACT_BORDER,
  ensureCornerStyle,
} from './constants';

const REGION_KEYS: RegionKey[] = ['leftEye', 'rightEye', 'mouth'];

export interface RegionsFrameListProps {
  totalFrames: number;
  regionsByFrame: Record<number, FaceRegions>;
  artifactsByFrame: Record<number, ArtifactRegion[]>;
  currentFrameIndex: number;
  onGoToFrame: (index: number) => void;
  frameListRefs: React.MutableRefObject<Map<number, HTMLLIElement | null>>;
  previewUrl: string;
  isImage: boolean;
  durationS?: number;
}

export function RegionsFrameList({
  totalFrames,
  regionsByFrame,
  artifactsByFrame,
  currentFrameIndex,
  onGoToFrame,
  frameListRefs,
  previewUrl,
  isImage,
  durationS = 3,
}: RegionsFrameListProps) {
  const [hoveredFrameIndex, setHoveredFrameIndex] = useState<number | null>(null);
  const [hoverRowRect, setHoverRowRect] = useState<{
    left: number;
    top: number;
    height: number;
  } | null>(null);
  const [hoverPreviewAspectRatio, setHoverPreviewAspectRatio] = useState(1);
  const hoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverPreviewVideoRef = useRef<HTMLVideoElement>(null);

  const clearHoverCloseTimeout = useCallback(() => {
    if (hoverCloseTimeoutRef.current != null) {
      clearTimeout(hoverCloseTimeoutRef.current);
      hoverCloseTimeoutRef.current = null;
    }
  }, []);

  const scheduleHoverClose = useCallback(() => {
    clearHoverCloseTimeout();
    hoverCloseTimeoutRef.current = setTimeout(() => {
      hoverCloseTimeoutRef.current = null;
      setHoveredFrameIndex(null);
      setHoverRowRect(null);
    }, 150);
  }, [clearHoverCloseTimeout]);

  useEffect(() => {
    if (isImage || hoveredFrameIndex == null) return;
    const v = hoverPreviewVideoRef.current;
    if (!v) return;
    const t =
      totalFrames > 0 ? (hoveredFrameIndex / totalFrames) * durationS : 0;
    v.currentTime = t;
    v.pause();
  }, [hoveredFrameIndex, totalFrames, isImage, durationS]);

  return (
    <div className="min-w-0 rounded-lg border border-border bg-muted/30 p-3">
      <h4 className="mb-2 text-sm font-medium text-foreground">
        Régions par image
      </h4>
      <div className="max-h-64 overflow-y-auto rounded border border-border/60 bg-background/50 lg:max-h-[320px]">
        <ul className="divide-y divide-border/60">
          {Array.from({ length: totalFrames }, (_, i) => {
            const frameRegions = regionsByFrame[i];
            const frameArtifacts = artifactsByFrame[i] ?? [];
            const hasRegions = frameRegions != null;
            const hasArtifacts = frameArtifacts.length > 0;
            const hasAny = hasRegions || hasArtifacts;
            const isCurrent = i === currentFrameIndex;
            return (
              <li
                key={i}
                ref={(el) => {
                  frameListRefs.current.set(i, el);
                }}
                role="button"
                tabIndex={0}
                onClick={() => onGoToFrame(i)}
                onMouseEnter={(e) => {
                  clearHoverCloseTimeout();
                  const rect = (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect();
                  setHoverRowRect({
                    left: rect.right,
                    top: rect.top,
                    height: rect.height,
                  });
                  setHoveredFrameIndex(i);
                }}
                onMouseLeave={() => scheduleHoverClose()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onGoToFrame(i);
                  }
                }}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/60 ${
                  isCurrent
                    ? 'bg-primary/15 ring-inset ring-1 ring-primary/40'
                    : ''
                }`}
              >
                <span className="shrink-0 text-sm font-medium text-foreground">
                  Image {i}
                  {isCurrent && (
                    <span className="ml-1.5 text-xs font-normal text-primary">
                      (actuelle)
                    </span>
                  )}
                </span>
                {(hasRegions || hasArtifacts) && (
                  <div
                    className="relative h-10 w-14 shrink-0 overflow-hidden rounded border border-border/60 bg-muted/50"
                    aria-hidden
                  >
                    {REGION_KEYS.map((key) => {
                      const r = frameRegions?.[key];
                      if (!r) return null;
                      return (
                        <div
                          key={key}
                          className="absolute border-2"
                          style={{
                            left: `${r.x * 100}%`,
                            top: `${r.y * 100}%`,
                            width: `${r.w * 100}%`,
                            height: `${r.h * 100}%`,
                            borderColor: REGION_BORDERS[key],
                            backgroundColor: REGION_COLORS[key],
                            borderRadius:
                              ensureCornerStyle(r) === 'rounded' ? 4 : 0,
                          }}
                        />
                      );
                    })}
                    {frameArtifacts.map((art, idx) => (
                      <div
                        key={`art-${idx}`}
                        className="absolute border-2"
                        style={{
                          left: `${art.x * 100}%`,
                          top: `${art.y * 100}%`,
                          width: `${art.w * 100}%`,
                          height: `${art.h * 100}%`,
                          borderColor: ARTIFACT_BORDER,
                          backgroundColor: ARTIFACT_COLOR,
                          borderRadius:
                            (art.cornerStyle ?? 'rounded') === 'rounded'
                              ? 4
                              : 0,
                        }}
                      />
                    ))}
                  </div>
                )}
                <span className="flex flex-1 flex-wrap gap-1">
                  {hasRegions &&
                    REGION_KEYS.map((key) => (
                      <span
                        key={key}
                        className="rounded px-1.5 py-0.5 text-xs font-medium text-foreground"
                        style={{
                          backgroundColor: REGION_COLORS[key],
                          color: 'rgba(0,0,0,0.85)',
                        }}
                      >
                        {REGION_LABELS[key]}
                      </span>
                    ))}
                  {frameArtifacts.map((art, idx) => (
                    <span
                      key={`art-${idx}`}
                      className="rounded px-1.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: ARTIFACT_COLOR,
                        color: 'rgba(255,255,255,0.95)',
                        border: `1px solid ${ARTIFACT_BORDER}`,
                      }}
                    >
                      {art.name || '?'}
                    </span>
                  ))}
                  {!hasAny && (
                    <span className="text-xs italic text-muted-foreground">
                      —
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {hoveredFrameIndex != null && hoverRowRect != null && (
        <div
          className="fixed z-50 overflow-hidden rounded-lg border-2 border-primary/50 bg-black shadow-xl"
          style={{
            left: hoverRowRect.left + 8,
            top: hoverRowRect.top,
            width: 200,
            maxHeight: 180,
          }}
          onMouseEnter={clearHoverCloseTimeout}
          onMouseLeave={() => {
            clearHoverCloseTimeout();
            setHoveredFrameIndex(null);
            setHoverRowRect(null);
          }}
        >
          {(() => {
            const frameRegions = regionsByFrame[hoveredFrameIndex];
            const hasRegions = frameRegions != null;
            return (
              <>
                <svg aria-hidden className="absolute h-0 w-0">
                  <defs>
                    <mask
                      id="hover-regions-mask"
                      maskContentUnits="objectBoundingBox"
                      maskUnits="objectBoundingBox"
                    >
                      <rect
                        x="0"
                        y="0"
                        width="1"
                        height="1"
                        fill="black"
                      />
                      {hasRegions &&
                        REGION_KEYS.map((key) => {
                          const r = frameRegions[key];
                          return r ? (
                            <rect
                              key={key}
                              x={r.x}
                              y={r.y}
                              width={r.w}
                              height={r.h}
                              fill="white"
                            />
                          ) : null;
                        })}
                    </mask>
                  </defs>
                </svg>
                <div
                  className="block w-full overflow-hidden bg-black"
                  style={{
                    aspectRatio: hoverPreviewAspectRatio,
                    maskImage: 'url(#hover-regions-mask)',
                    maskSize: '100% 100%',
                    maskPosition: '0 0',
                    WebkitMaskImage: 'url(#hover-regions-mask)',
                    WebkitMaskSize: '100% 100%',
                    WebkitMaskPosition: '0 0',
                  }}
                >
                  {isImage ? (
                    <img
                      src={previewUrl}
                      alt={`Frame ${hoveredFrameIndex}`}
                      className="block h-full w-full object-contain"
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        if (img.naturalWidth && img.naturalHeight) {
                          setHoverPreviewAspectRatio(
                            img.naturalWidth / img.naturalHeight
                          );
                        }
                      }}
                    />
                  ) : (
                    <video
                      ref={hoverPreviewVideoRef}
                      src={previewUrl}
                      muted
                      playsInline
                      className="block h-full w-full object-contain"
                      preload="metadata"
                      onLoadedMetadata={() => {
                        const v = hoverPreviewVideoRef.current;
                        if (!v || hoveredFrameIndex == null) return;
                        if (v.videoWidth && v.videoHeight) {
                          setHoverPreviewAspectRatio(
                            v.videoWidth / v.videoHeight
                          );
                        }
                        const duration = Number.isFinite(v.duration)
                          ? v.duration
                          : durationS;
                        const t =
                          totalFrames > 0
                            ? (hoveredFrameIndex / totalFrames) * duration
                            : 0;
                        v.currentTime = t;
                        v.pause();
                      }}
                    />
                  )}
                </div>
                <p className="bg-muted/80 px-2 py-1 text-center text-xs text-muted-foreground">
                  Image {hoveredFrameIndex} — uniquement les régions
                </p>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
