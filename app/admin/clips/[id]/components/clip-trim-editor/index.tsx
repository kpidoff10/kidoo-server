'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { CharacterClipDetail } from '../../../../lib/charactersApi';
import { isVideoUrl } from './components/utils';
import { TrimSegmentPreview } from './components/TrimSegmentPreview';
import { TrimTrack } from './components/TrimTrack';
import { TrimNotVideoMessage } from './components/TrimNotVideoMessage';
import { SegmentSummary } from './components/SegmentSummary';

export interface ClipTrimEditorProps {
  clip: CharacterClipDetail;
  onTrimSuccess?: () => void;
  onTrim?: (startTimeS: number, endTimeS: number) => Promise<unknown>;
  isTrimming?: boolean;
}

type DraggingThumb = 'start' | 'end' | null;

export function ClipTrimEditor({
  clip,
  onTrimSuccess,
  onTrim,
  isTrimming = false,
}: ClipTrimEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(clip.durationS ?? 0);
  const [startTimeS, setStartTimeS] = useState(0);
  const [endTimeS, setEndTimeS] = useState(clip.durationS ?? 0);
  const [dragging, setDragging] = useState<DraggingThumb>(null);

  const isVideo = isVideoUrl(clip.previewUrl ?? '');

  useEffect(() => {
    const d = clip.durationS ?? 0;
    if (d <= 0) return;
    queueMicrotask(() => {
      setDuration(d);
      setEndTimeS((prev) => (prev > d ? d : prev));
    });
  }, [clip.durationS]);

  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration)) {
      const d = v.duration;
      setDuration(d);
      setEndTimeS(d);
      setStartTimeS(0);
    }
  }, []);

  const clientXToTime = useCallback(
    (clientX: number): number => {
      const el = trackRef.current;
      if (!el || duration <= 0) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration]
  );

  const handleThumbPointerDown = useCallback(
    (e: React.PointerEvent, which: 'start' | 'end') => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(which);
    },
    []
  );

  const handleTrackPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging === null) return;
      const t = clientXToTime(e.clientX);
      if (dragging === 'start') {
        setStartTimeS(Math.max(0, Math.min(t, endTimeS - 0.1)));
      } else {
        setEndTimeS(Math.max(startTimeS + 0.1, Math.min(t, duration || 999)));
      }
    },
    [dragging, clientXToTime, startTimeS, endTimeS, duration]
  );

  const handleTrackPointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleTrackPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (trackRef.current && !(e.target as HTMLElement).closest('[role="slider"]')) {
        const t = clientXToTime(e.clientX);
        const mid = (startTimeS + endTimeS) / 2;
        if (t < mid) {
          setStartTimeS(Math.max(0, Math.min(t, endTimeS - 0.1)));
          setDragging('start');
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } else {
          setEndTimeS(Math.max(startTimeS + 0.1, Math.min(t, duration || 999)));
          setDragging('end');
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }
      }
    },
    [clientXToTime, startTimeS, endTimeS, duration]
  );

  const handleThumbKeyDown = useCallback(
    (e: React.KeyboardEvent, which: 'start' | 'end') => {
      const step = 0.1;
      if (which === 'start') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setStartTimeS((s) => Math.max(0, Math.min(s - step, endTimeS - 0.1)));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setStartTimeS((s) => Math.max(0, Math.min(s + step, endTimeS - 0.1)));
        }
      } else {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setEndTimeS((s) => Math.max(startTimeS + 0.1, Math.min(s - step, duration || 999)));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setEndTimeS((s) => Math.max(startTimeS + 0.1, Math.min(s + step, duration || 999)));
        }
      }
    },
    [startTimeS, endTimeS, duration]
  );

  const handleTrim = useCallback(async () => {
    if (!onTrim || duration <= 0 || startTimeS >= endTimeS) return;
    try {
      await onTrim(startTimeS, endTimeS);
      onTrimSuccess?.();
    } catch {
      // erreur gérée par le parent
    }
  }, [onTrim, onTrimSuccess, duration, startTimeS, endTimeS]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || duration <= 0) return;
    v.currentTime = startTimeS;
  }, [startTimeS, endTimeS, duration]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || endTimeS <= startTimeS) return;
    if (v.currentTime >= endTimeS - 0.05) {
      v.currentTime = startTimeS;
    }
  }, [startTimeS, endTimeS]);

  const handlePlaySegment = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = startTimeS;
    v.play().catch(() => {});
  }, [startTimeS]);

  if (!isVideo || !clip.previewUrl) {
    return <TrimNotVideoMessage />;
  }

  const videoPreviewUrl = clip.updatedAt
    ? `${clip.previewUrl}${clip.previewUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(clip.updatedAt)}`
    : clip.previewUrl;
  const segmentDuration = Math.max(0, endTimeS - startTimeS);

  return (
    <div className="space-y-4">
      <TrimSegmentPreview
        videoRef={videoRef}
        videoPreviewUrl={videoPreviewUrl}
        segmentDuration={segmentDuration}
        onPlaySegment={handlePlaySegment}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />

      <p className="text-xs text-muted-foreground">
        Glissez le pin bleu (début) et le pin rouge (fin) pour définir le
        segment. L'aperçu ci‑dessus montre le segment (boucle). Le nouveau MP4
        sera enregistré sur Cloudflare.
      </p>

      <TrimTrack
        trackRef={trackRef}
        startTimeS={startTimeS}
        endTimeS={endTimeS}
        duration={duration}
        onThumbPointerDown={handleThumbPointerDown}
        onTrackPointerMove={handleTrackPointerMove}
        onTrackPointerUp={handleTrackPointerUp}
        onTrackPointerDown={handleTrackPointerDown}
        onThumbKeyDown={handleThumbKeyDown}
      />

      <SegmentSummary
        segmentDuration={segmentDuration}
        startTimeS={startTimeS}
        endTimeS={endTimeS}
        isTrimming={isTrimming}
        onTrim={onTrim ? handleTrim : undefined}
      />
    </div>
  );
}
