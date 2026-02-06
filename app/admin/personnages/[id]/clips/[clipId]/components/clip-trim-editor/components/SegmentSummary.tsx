'use client';

import { Button } from '@/components/ui/button';
import { formatTime } from './utils';

export interface SegmentSummaryProps {
  segmentDuration: number;
  startTimeS: number;
  endTimeS: number;
  isTrimming?: boolean;
  onTrim?: () => void;
}

export function SegmentSummary({
  segmentDuration,
  startTimeS,
  endTimeS,
  isTrimming = false,
  onTrim,
}: SegmentSummaryProps) {
  return (
    <>
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Segment conservé : </span>
        <span className="font-mono font-medium text-foreground">
          {formatTime(segmentDuration)}
        </span>
        <span className="text-muted-foreground">
          {' '}
          (de {formatTime(startTimeS)} à {formatTime(endTimeS)})
        </span>
      </div>

      {onTrim && (
        <Button
          type="button"
          onClick={onTrim}
          disabled={isTrimming || segmentDuration < 0.1}
          title="Enregistre le nouveau MP4 sur Cloudflare (remplace l'actuel)"
        >
          {isTrimming ? 'Découpage en cours…' : 'Enregistrer la vidéo découpée'}
        </Button>
      )}
    </>
  );
}
