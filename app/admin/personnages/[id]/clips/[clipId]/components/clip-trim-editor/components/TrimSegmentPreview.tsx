'use client';

import { RefObject } from 'react';
import { Button } from '@/components/ui/button';

export interface TrimSegmentPreviewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoPreviewUrl: string;
  segmentDuration: number;
  onPlaySegment: () => void;
  onTimeUpdate: () => void;
  onLoadedMetadata: () => void;
}

export function TrimSegmentPreview({
  videoRef,
  videoPreviewUrl,
  segmentDuration,
  onPlaySegment,
  onTimeUpdate,
  onLoadedMetadata,
}: TrimSegmentPreviewProps) {
  return (
    <div className="rounded-md border border-border bg-black/80">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-2 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Aperçu du découpage
        </span>
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
      <div className="flex justify-center p-1">
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
      </div>
    </div>
  );
}
