'use client';

import type { Ref } from 'react';
import { useCallback, useRef } from 'react';
import type { FaceRegions, ArtifactRegion } from '@/app/admin/lib/charactersApi';
import type { RegionKey } from '../constants';
import { expandRegionForPreview } from '../constants';

export interface RealtimePreviewProps {
  previewUrl: string;
  regions: FaceRegions;
  artifacts: ArtifactRegion[];
  mainMediaAspect: { w: number; h: number };
  frameWidth: number;
  frameHeight: number;
  isImage: boolean;
  currentFrameIndex: number;
  totalFrames: number;
  fps: number;
  isPreviewPlaying: boolean;
  onTogglePlay: () => void;
  onLoadedMetadata?: (width: number, height: number, duration: number) => void;
  /** Ref vers l’élément vidéo pour que le parent puisse contrôler currentTime / play / pause */
  videoRef?: Ref<HTMLVideoElement | null>;
}

export function RealtimePreview({
  previewUrl,
  regions,
  artifacts,
  mainMediaAspect,
  frameWidth,
  frameHeight,
  isImage,
  currentFrameIndex,
  totalFrames,
  fps,
  isPreviewPlaying,
  onTogglePlay,
  onLoadedMetadata,
  videoRef: videoRefFromParent,
}: RealtimePreviewProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const setVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      (localVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
      if (videoRefFromParent) {
        if (typeof videoRefFromParent === 'function') {
          videoRefFromParent(el);
        } else {
          (videoRefFromParent as React.MutableRefObject<HTMLVideoElement | null>).current = el;
        }
      }
    },
    [videoRefFromParent]
  );

  const regionKeys: RegionKey[] = ['leftEye', 'rightEye', 'mouth'];

  return (
    <div
      className="flex shrink-0 flex-col overflow-hidden rounded-md border-2 border-green-600"
      style={{
        width: frameWidth > 0 ? frameWidth : undefined,
        height: frameHeight > 0 ? frameHeight + 36 : undefined,
        backgroundColor: '#16a34a',
      }}
    >
      <div className="flex items-center justify-center gap-2 bg-green-700 px-2 py-1">
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={totalFrames <= 1}
          title={
            totalFrames <= 1
              ? 'Une seule frame'
              : isPreviewPlaying
                ? "Arrêter l'animation"
                : "Lancer l'animation (toutes les frames)"
          }
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white/20 text-white transition-colors hover:bg-white/30 disabled:opacity-50 disabled:hover:bg-white/20"
          aria-label={isPreviewPlaying ? 'Arrêter' : 'Play'}
        >
          {isPreviewPlaying ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <span className="text-xs font-medium text-white">
          {isPreviewPlaying ? 'Animation…' : 'Aperçu régions (fond vert)'}
        </span>
      </div>
      <svg aria-hidden className="absolute h-0 w-0">
        <defs>
          <mask
            id="realtime-regions-mask"
            maskContentUnits="objectBoundingBox"
            maskUnits="objectBoundingBox"
          >
            <rect x="0" y="0" width="1" height="1" fill="black" />
            {regionKeys.map((key) => {
              const r = regions[key];
              if (!r) return null;
              const exp = expandRegionForPreview(r);
              return (
                <rect
                  key={key}
                  x={exp.x}
                  y={exp.y}
                  width={exp.w}
                  height={exp.h}
                  fill="white"
                />
              );
            })}
            {artifacts.map((art, idx) => {
              const exp = expandRegionForPreview(art);
              return (
                <rect
                  key={`art-${idx}`}
                  x={exp.x}
                  y={exp.y}
                  width={exp.w}
                  height={exp.h}
                  fill="white"
                />
              );
            })}
          </mask>
        </defs>
      </svg>
      <div
        className="block w-full shrink-0 overflow-hidden"
        style={{
          width: frameWidth > 0 ? frameWidth : undefined,
          height: frameHeight > 0 ? frameHeight : undefined,
          aspectRatio: frameWidth <= 0 ? `${mainMediaAspect.w} / ${mainMediaAspect.h}` : undefined,
          backgroundColor: '#16a34a',
          maskImage: 'url(#realtime-regions-mask)',
          maskSize: '100% 100%',
          maskPosition: '0 0',
          maskOrigin: 'border-box',
          WebkitMaskImage: 'url(#realtime-regions-mask)',
          WebkitMaskSize: '100% 100%',
          WebkitMaskPosition: '0 0',
          WebkitMaskOrigin: 'border-box',
        }}
      >
        {isImage ? (
          <img
            src={previewUrl}
            alt="Aperçu régions"
            className="block h-full w-full object-contain object-center"
          />
        ) : (
          <video
            ref={setVideoRef}
            src={previewUrl}
            muted
            playsInline
            className="block h-full w-full object-contain object-center"
            preload="metadata"
            onLoadedMetadata={() => {
              const v = localVideoRef.current;
              if (!v) return;
              if (v.videoWidth && v.videoHeight && onLoadedMetadata) {
                onLoadedMetadata(
                  v.videoWidth,
                  v.videoHeight,
                  Number.isFinite(v.duration) ? v.duration : 0
                );
              }
              if (Number.isFinite(v.duration)) {
                const t = currentFrameIndex / fps;
                v.currentTime = t;
                v.pause();
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
