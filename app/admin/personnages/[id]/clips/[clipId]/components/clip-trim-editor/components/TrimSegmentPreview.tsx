'use client';

import { RefObject, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ResolutionFrame } from '../../shared/ResolutionFrame';

export interface TrimSegmentPreviewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoPreviewUrl: string;
  segmentDuration: number;
  onPlaySegment: () => void;
  onTimeUpdate: () => void;
  onLoadedMetadata: () => void;
  targetWidth?: number;
  targetHeight?: number;
}

export function TrimSegmentPreview({
  videoRef,
  videoPreviewUrl,
  segmentDuration,
  onPlaySegment,
  onTimeUpdate,
  onLoadedMetadata,
  targetWidth,
  targetHeight,
}: TrimSegmentPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showFrame, setShowFrame] = useState(true);

  const hasTarget = targetWidth && targetHeight && targetWidth > 0 && targetHeight > 0;

  return (
    <div className="rounded-md border border-border bg-black/80">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-2 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Aperçu du découpage
        </span>
        <div className="flex items-center gap-2">
          {hasTarget && (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={showFrame}
                onChange={(e) => setShowFrame(e.target.checked)}
                className="h-3 w-3"
              />
              Cadre {targetWidth}x{targetHeight}
            </label>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={onPlaySegment}
            disabled={segmentDuration < 0.1}
          >
            ▶ Lire le segment
          </Button>
        </div>
      </div>
      <div ref={containerRef} className="relative flex justify-center p-1">
        <video
          ref={videoRef}
          src={videoPreviewUrl}
          playsInline
          muted
          loop={false}
          className="max-h-[280px] max-w-full rounded"
          preload="metadata"
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
        >
          Votre navigateur ne prend pas en charge la vidéo.
        </video>
        <ResolutionFrame
          containerRef={containerRef}
          mediaRef={videoRef}
          targetWidth={targetWidth}
          targetHeight={targetHeight}
          visible={showFrame}
        />
      </div>
    </div>
  );
}
