'use client';

import { RefObject } from 'react';
import { Button } from '@/components/ui/button';

export interface LoopSegmentPreviewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoPreviewUrl: string;
  segmentDuration: number;
  onPlaySegment: () => void;
  onTimeUpdate: () => void;
}

export function LoopSegmentPreview({
  videoRef,
  videoPreviewUrl,
  segmentDuration,
  onPlaySegment,
  onTimeUpdate,
}: LoopSegmentPreviewProps) {
  return (
    <div className="rounded-md border border-border bg-black/80">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-2 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Aperçu du segment de boucle
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={onPlaySegment}
          disabled={segmentDuration < 0.05}
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
          onTimeUpdate={onTimeUpdate}
        >
          Votre navigateur ne prend pas en charge la vidéo.
        </video>
      </div>
    </div>
  );
}
