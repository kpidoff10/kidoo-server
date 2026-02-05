'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipFaceRegionsEditor } from '../clip-face-regions-editor';
import { ClipTrimEditor } from '../clip-trim-editor';
import { ClipVideoCreation } from '../clip-video-creation';
import type { CharacterClipDetail, FaceRegions, ArtifactRegion } from '../../../../../../lib/charactersApi';
import { isVideoUrl } from './components/utils';
import { LoopSegmentPreview } from './components/LoopSegmentPreview';
import { LoopTrack } from './components/LoopTrack';
import { NoPreviewMessage } from './components/NoPreviewMessage';

type DraggingLoopPin = 'start' | 'end' | null;

export interface ClipDetailPreviewProps {
  clip: CharacterClipDetail;
  /** Sauvegarde régions visage + artefacts en un seul PATCH */
  onSaveRegions?: (data: {
    faceRegionsByFrame: Record<string, FaceRegions>;
    artifactsByFrame: Record<string, ArtifactRegion[]>;
  }) => void;
  onTrim?: (startTimeS: number, endTimeS: number) => Promise<unknown>;
  /** Génère les images masques (fond noir + région blanche) par région, upload R2, enregistre les URL */
  onGenerateRegionImages?: () => void;
  isSavingRegions?: boolean;
  isTrimming?: boolean;
  isGeneratingRegionImages?: boolean;
}

export function ClipDetailPreview({
  clip,
  onSaveRegions,
  onTrim,
  onGenerateRegionImages,
  isSavingRegions = false,
  isTrimming = false,
  isGeneratingRegionImages = false,
}: ClipDetailPreviewProps) {
  const segmentVideoRef = useRef<HTMLVideoElement>(null);
  const loopTrackRef = useRef<HTMLDivElement>(null);

  const duration = clip.durationS ?? 0;
  const totalFrames = clip.frames ?? Math.max(1, Math.ceil(duration * (clip.fps ?? 30)));
  const [loopStartFrame, setLoopStartFrame] = useState(() =>
    clip.loopStartFrame != null ? clip.loopStartFrame : 0
  );
  const [loopEndFrame, setLoopEndFrame] = useState(() =>
    clip.loopEndFrame != null ? clip.loopEndFrame : Math.max(0, totalFrames - 1)
  );
  const [draggingLoopPin, setDraggingLoopPin] = useState<DraggingLoopPin>(null);
  const lastSyncedLoopRef = useRef({
    start: clip.loopStartFrame,
    end: clip.loopEndFrame,
  });

  useEffect(() => {
    if (draggingLoopPin !== null) return;
    const clipStart = clip.loopStartFrame;
    const clipEnd = clip.loopEndFrame;
    if (
      lastSyncedLoopRef.current.start === clipStart &&
      lastSyncedLoopRef.current.end === clipEnd
    )
      return;
    lastSyncedLoopRef.current = { start: clipStart, end: clipEnd };
    const start = clipStart != null ? clipStart : 0;
    const end =
      clipEnd != null ? clipEnd : Math.max(0, totalFrames - 1);
    queueMicrotask(() => {
      setLoopStartFrame(start);
      setLoopEndFrame(end);
    });
  }, [clip.loopStartFrame, clip.loopEndFrame, totalFrames, draggingLoopPin]);

  const startTimeS =
    duration > 0 && totalFrames > 0 ? (loopStartFrame / totalFrames) * duration : 0;
  const endTimeS =
    duration > 0 && totalFrames > 0
      ? Math.min(((loopEndFrame + 1) / totalFrames) * duration, duration)
      : duration;

  const clientXToFrame = useCallback(
    (clientX: number): number => {
      const el = loopTrackRef.current;
      if (!el || totalFrames <= 0) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.min(Math.floor(ratio * totalFrames), totalFrames - 1);
    },
    [totalFrames]
  );

  const handleLoopThumbPointerDown = useCallback(
    (e: React.PointerEvent, which: 'start' | 'end') => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDraggingLoopPin(which);
    },
    []
  );

  const handleLoopTrackPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (draggingLoopPin === null) return;
      const f = clientXToFrame(e.clientX);
      if (draggingLoopPin === 'start') {
        setLoopStartFrame(Math.max(0, Math.min(f, loopEndFrame)));
      } else {
        setLoopEndFrame(Math.max(loopStartFrame, Math.min(f, totalFrames - 1)));
      }
    },
    [draggingLoopPin, clientXToFrame, loopStartFrame, loopEndFrame, totalFrames]
  );

  const handleLoopTrackPointerUp = useCallback(() => {
    setDraggingLoopPin(null);
  }, []);

  const handleLoopTrackPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (loopTrackRef.current && !(e.target as HTMLElement).closest('[role="slider"]')) {
        const f = clientXToFrame(e.clientX);
        const mid = (loopStartFrame + loopEndFrame) / 2;
        if (f < mid) {
          setLoopStartFrame(Math.max(0, Math.min(f, loopEndFrame)));
          setDraggingLoopPin('start');
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } else {
          setLoopEndFrame(Math.max(loopStartFrame, Math.min(f, totalFrames - 1)));
          setDraggingLoopPin('end');
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }
      }
    },
    [clientXToFrame, loopStartFrame, loopEndFrame, totalFrames]
  );

  const handleLoopThumbKeyDown = useCallback(
    (e: React.KeyboardEvent, which: 'start' | 'end') => {
      if (which === 'start') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setLoopStartFrame((s) => Math.max(0, Math.min(s - 1, loopEndFrame)));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setLoopStartFrame((s) => Math.max(0, Math.min(s + 1, loopEndFrame)));
        }
      } else {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setLoopEndFrame((s) =>
            Math.max(loopStartFrame, Math.min(s - 1, totalFrames - 1))
          );
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setLoopEndFrame((s) =>
            Math.max(loopStartFrame, Math.min(s + 1, totalFrames - 1))
          );
        }
      }
    },
    [loopStartFrame, loopEndFrame, totalFrames]
  );

  const handleSegmentTimeUpdate = useCallback(() => {
    const v = segmentVideoRef.current;
    if (!v || endTimeS <= startTimeS) return;
    if (v.currentTime >= endTimeS - 0.05) {
      v.currentTime = startTimeS;
    }
  }, [startTimeS, endTimeS]);

  const handlePlaySegment = useCallback(() => {
    const v = segmentVideoRef.current;
    if (!v) return;
    v.currentTime = startTimeS;
    v.play().catch(() => {});
  }, [startTimeS]);

  useEffect(() => {
    const v = segmentVideoRef.current;
    if (!v || duration <= 0) return;
    v.currentTime = startTimeS;
  }, [startTimeS, endTimeS, duration]);

  if (!clip.previewUrl) {
    return <NoPreviewMessage clip={clip} />;
  }

  const videoPreviewUrl = clip.updatedAt
    ? `${clip.previewUrl}${clip.previewUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(clip.updatedAt)}`
    : clip.previewUrl;

  const isVideo = isVideoUrl(clip.previewUrl);
  const segmentDuration = Math.max(0, endTimeS - startTimeS);

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Aperçu</h2>
      <Tabs defaultValue="boucle" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="boucle">Boucle</TabsTrigger>
          <TabsTrigger value="decouper">Découper</TabsTrigger>
          <TabsTrigger value="autre">Régions</TabsTrigger>
          <TabsTrigger value="creation">Création de la vidéo</TabsTrigger>
        </TabsList>
        <TabsContent value="boucle" className="mt-4">
          <div className="flex flex-col gap-4">
            {isVideo && duration > 0 && (
              <>
                <LoopSegmentPreview
                  videoRef={segmentVideoRef}
                  videoPreviewUrl={videoPreviewUrl}
                  segmentDuration={segmentDuration}
                  onPlaySegment={handlePlaySegment}
                  onTimeUpdate={handleSegmentTimeUpdate}
                />
                <LoopTrack
                  trackRef={loopTrackRef}
                  loopStartFrame={loopStartFrame}
                  loopEndFrame={loopEndFrame}
                  totalFrames={totalFrames}
                  startTimeS={startTimeS}
                  endTimeS={endTimeS}
                  onThumbPointerDown={handleLoopThumbPointerDown}
                  onTrackPointerMove={handleLoopTrackPointerMove}
                  onTrackPointerUp={handleLoopTrackPointerUp}
                  onTrackPointerDown={handleLoopTrackPointerDown}
                  onThumbKeyDown={handleLoopThumbKeyDown}
                />
              </>
            )}
          </div>
        </TabsContent>
        <TabsContent value="decouper" className="mt-4">
          <ClipTrimEditor
            clip={clip}
            onTrim={onTrim ? (start, end) => onTrim(start, end) : undefined}
            onTrimSuccess={() => {}}
            isTrimming={isTrimming}
          />
        </TabsContent>
        <TabsContent value="autre" className="mt-4">
          <ClipFaceRegionsEditor
            clip={clip}
            onSave={onSaveRegions}
            onGenerateRegionImages={onGenerateRegionImages}
            isSaving={isSavingRegions}
            isGeneratingRegionImages={isGeneratingRegionImages}
          />
        </TabsContent>
        <TabsContent value="creation" className="mt-4">
          <ClipVideoCreation clip={clip} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
