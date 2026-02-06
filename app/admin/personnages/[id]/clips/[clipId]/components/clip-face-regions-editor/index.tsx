'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type {
  CharacterClipDetail,
  FaceRegion,
  FaceRegions,
  ArtifactRegion,
} from '../../../../../../lib/charactersApi';
import {
  getDefaultRegions,
  isImageUrl,
  clamp01,
} from './constants';
import type { RegionKey } from './constants';
import { RealtimePreview } from './components/RealtimePreview';
import { FrameControls } from './components/FrameControls';
import { ArtifactsPanel } from './components/ArtifactsPanel';
import type { ResizeHandle } from './components/RegionOverlay';
import { RegionOverlay } from './components/RegionOverlay';
import { RegionsFrameList } from './components/RegionsFrameList';

export interface ClipFaceRegionsEditorProps {
  clip: CharacterClipDetail;
  /** Sauvegarde régions + artefacts (un seul enregistrement) */
  onSave?: (data: {
    faceRegionsByFrame: Record<string, FaceRegions>;
    artifactsByFrame: Record<string, ArtifactRegion[]>;
  }) => void;
  /** Génère les images masques par région (fond noir + région blanche), upload R2, enregistre les URL en BDD */
  onGenerateRegionImages?: () => void;
  isSaving?: boolean;
  isGeneratingRegionImages?: boolean;
}

export function ClipFaceRegionsEditor({
  clip,
  onSave,
  onGenerateRegionImages,
  isSaving = false,
  isGeneratingRegionImages = false,
}: ClipFaceRegionsEditorProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const frameContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoDurationRef = useRef<number>(0);
  const frameListRefs = useRef<Map<number, HTMLLIElement | null>>(new Map());
  const realtimePreviewVideoRef = useRef<HTMLVideoElement>(null);
  /** Dimensions du média principal pour aspect-ratio exact (évite décalage masque/aperçu) */
  const [mainMediaAspect, setMainMediaAspect] = useState<{ w: number; h: number }>({ w: 1, h: 1 });
  /** Dimensions affichées de la frame (pour aligner l'aperçu régions) */
  const [frameSize, setFrameSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewPlayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fps = clip.fps ?? 30;
  const totalFrames = Math.max(
    1,
    clip.frames ?? (clip.durationS ? Math.ceil(clip.durationS * fps) : 1)
  );
  const isImage = isImageUrl(clip.previewUrl ?? '');

  const [regionsByFrame, setRegionsByFrame] = useState<Record<number, FaceRegions>>(() => {
    const byFrame = clip.faceRegionsByFrame;
    if (byFrame && Object.keys(byFrame).length > 0) {
      const out: Record<number, FaceRegions> = {};
      for (const [k, v] of Object.entries(byFrame)) {
        const fi = parseInt(k, 10);
        if (!Number.isNaN(fi)) out[fi] = v;
      }
      return out;
    }
    return { 0: getDefaultRegions() };
  });

  const [artifactsByFrame, setArtifactsByFrame] = useState<Record<number, ArtifactRegion[]>>(() => {
    const byFrame = clip.artifactsByFrame;
    if (byFrame && Object.keys(byFrame).length > 0) {
      const out: Record<number, ArtifactRegion[]> = {};
      for (const [k, v] of Object.entries(byFrame)) {
        const fi = parseInt(k, 10);
        if (!Number.isNaN(fi) && Array.isArray(v)) out[fi] = v;
      }
      return out;
    }
    return {};
  });

  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const regions = regionsByFrame[currentFrameIndex] ?? getDefaultRegions();
  const currentArtifacts = artifactsByFrame[currentFrameIndex] ?? [];

  /** Nombre de frames qui ont des régions définies (entre 0 et totalFrames-1) */
  const framesManaged = (() => {
    let n = 0;
    for (let i = 0; i < totalFrames; i++) {
      if (regionsByFrame[i] != null) n++;
    }
    return n;
  })();
  const allFramesManaged = framesManaged >= totalFrames;

  const goToFrame = useCallback(
    (nextIndex: number) => {
      const clamped = Math.max(0, Math.min(totalFrames - 1, nextIndex));
      setRegionsByFrame((prev) => {
        const currentRegions = prev[currentFrameIndex] ?? getDefaultRegions();
        if (prev[clamped] != null) return prev;
        return { ...prev, [clamped]: JSON.parse(JSON.stringify(currentRegions)) };
      });
      setCurrentFrameIndex(clamped);
    },
    [currentFrameIndex, totalFrames]
  );

  const togglePreviewPlay = useCallback(() => {
    if (isPreviewPlaying) {
      if (previewPlayIntervalRef.current) {
        clearInterval(previewPlayIntervalRef.current);
        previewPlayIntervalRef.current = null;
      }
      setIsPreviewPlaying(false);
      return;
    }
    goToFrame(0);
    setIsPreviewPlaying(true);
    const intervalMs = 1000 / (clip.fps ?? 30);
    previewPlayIntervalRef.current = setInterval(() => {
      setCurrentFrameIndex((prev) => {
        if (prev >= totalFrames - 1) {
          if (previewPlayIntervalRef.current) {
            clearInterval(previewPlayIntervalRef.current);
            previewPlayIntervalRef.current = null;
          }
          setIsPreviewPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);
  }, [isPreviewPlaying, totalFrames, clip.fps, goToFrame]);

  useEffect(() => {
    return () => {
      if (previewPlayIntervalRef.current) {
        clearInterval(previewPlayIntervalRef.current);
        previewPlayIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const el = frameContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setFrameSize({ width: Math.round(width), height: Math.round(height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [, setActiveRegion] = useState<RegionKey | null>(null);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    initialX: number;
    initialY: number;
    region: FaceRegion;
    pointerId: number;
    mode: 'move' | 'resize';
    key: RegionKey;
    resizeHandle?: ResizeHandle;
  } | null>(null);

  const dragArtifactRef = useRef<{
    x: number;
    y: number;
    initialX: number;
    initialY: number;
    artifact: ArtifactRegion;
    pointerId: number;
    mode: 'move' | 'resize';
    index: number;
    resizeHandle?: ResizeHandle;
  } | null>(null);

  useEffect(() => {
    if (!clip.faceRegionsByFrame || Object.keys(clip.faceRegionsByFrame).length === 0) return;
    const out: Record<number, FaceRegions> = {};
    for (const [k, v] of Object.entries(clip.faceRegionsByFrame)) {
      const fi = parseInt(k, 10);
      if (!Number.isNaN(fi)) out[fi] = v;
    }
    const toMerge = out;
    queueMicrotask(() => {
      setRegionsByFrame((prev) => ({ ...prev, ...toMerge }));
    });
  }, [clip.id, clip.faceRegionsByFrame]);

  useEffect(() => {
    if (!clip.artifactsByFrame || Object.keys(clip.artifactsByFrame).length === 0) return;
    const out: Record<number, ArtifactRegion[]> = {};
    for (const [k, v] of Object.entries(clip.artifactsByFrame)) {
      const fi = parseInt(k, 10);
      if (!Number.isNaN(fi) && Array.isArray(v)) out[fi] = v;
    }
    queueMicrotask(() => {
      setArtifactsByFrame((prev) => ({ ...prev, ...out }));
    });
  }, [clip.id, clip.artifactsByFrame]);

  useEffect(() => {
    if (isImage) return;
    const v = videoRef.current;
    const v2 = realtimePreviewVideoRef.current;
    if (!v || videoDurationRef.current <= 0) return;
    const t = totalFrames > 0 ? (currentFrameIndex / totalFrames) * videoDurationRef.current : 0;
    v.currentTime = t;
    v.pause();
    if (v2) {
      v2.currentTime = t;
      v2.pause();
    }
  }, [currentFrameIndex, totalFrames, isImage]);

  // Garder la ligne de l'image actuelle visible dans la liste
  useEffect(() => {
    const el = frameListRefs.current.get(currentFrameIndex);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentFrameIndex]);

  const doClientToNormalized = useCallback((clientX: number, clientY: number) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }, []);

  const applyResize = useCallback(
    (r: FaceRegion, dxTotal: number, dyTotal: number, handle: ResizeHandle): FaceRegion => {
      const minSize = 0.02;
      let { x, y, w, h } = r;
      switch (handle) {
        case 'se':
          w = Math.max(minSize, r.w + dxTotal);
          h = Math.max(minSize, r.h + dyTotal);
          break;
        case 'sw':
          x = r.x + dxTotal;
          w = Math.max(minSize, r.w - dxTotal);
          h = Math.max(minSize, r.h + dyTotal);
          break;
        case 'ne':
          y = r.y + dyTotal;
          w = Math.max(minSize, r.w + dxTotal);
          h = Math.max(minSize, r.h - dyTotal);
          break;
        case 'nw':
          x = r.x + dxTotal;
          y = r.y + dyTotal;
          w = Math.max(minSize, r.w - dxTotal);
          h = Math.max(minSize, r.h - dyTotal);
          break;
      }
      x = clamp01(x);
      y = clamp01(y);
      w = Math.max(minSize, Math.min(1 - x, w));
      h = Math.max(minSize, Math.min(1 - y, h));
      return { ...r, x, y, w, h };
    },
    []
  );

  const applyArtifactResize = useCallback(
    (a: ArtifactRegion, dxTotal: number, dyTotal: number, handle: ResizeHandle): ArtifactRegion => {
      const minSize = 0.05;
      let { x, y, w, h } = a;
      switch (handle) {
        case 'se':
          w = Math.max(minSize, a.w + dxTotal);
          h = Math.max(minSize, a.h + dyTotal);
          break;
        case 'sw':
          x = a.x + dxTotal;
          w = Math.max(minSize, a.w - dxTotal);
          h = Math.max(minSize, a.h + dyTotal);
          break;
        case 'ne':
          y = a.y + dyTotal;
          w = Math.max(minSize, a.w + dxTotal);
          h = Math.max(minSize, a.h - dyTotal);
          break;
        case 'nw':
          x = a.x + dxTotal;
          y = a.y + dyTotal;
          w = Math.max(minSize, a.w - dxTotal);
          h = Math.max(minSize, a.h - dyTotal);
          break;
      }
      x = clamp01(x);
      y = clamp01(y);
      w = Math.max(minSize, Math.min(1 - x, w));
      h = Math.max(minSize, Math.min(1 - y, h));
      return { ...a, x, y, w, h };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, key: RegionKey, mode: 'move' | 'resize', handle?: ResizeHandle) => {
      e.preventDefault();
      const r = regions[key];
      if (!r) return;
      const { x, y } = doClientToNormalized(e.clientX, e.clientY);
      setActiveRegion(key);
      dragStartRef.current = {
        x,
        y,
        initialX: x,
        initialY: y,
        region: { ...r },
        pointerId: e.pointerId,
        mode,
        key,
        resizeHandle: mode === 'resize' ? (handle ?? 'se') : undefined,
      };

      const onMove = (moveEvent: PointerEvent) => {
        const start = dragStartRef.current;
        if (!start || moveEvent.pointerId !== start.pointerId) return;
        const pos = doClientToNormalized(moveEvent.clientX, moveEvent.clientY);
        const { key: k, mode: m } = start;
        const dx = pos.x - start.x;
        const dy = pos.y - start.y;
        const dxTotal = pos.x - start.initialX;
        const dyTotal = pos.y - start.initialY;

        setRegionsByFrame((prev) => {
          const current = prev[currentFrameIndex] ?? getDefaultRegions();
          const rk = current[k];
          if (!rk) return prev;
          const nextRegions = { ...current };
          if (m === 'move') {
            nextRegions[k] = {
              ...rk,
              x: clamp01(rk.x + dx),
              y: clamp01(rk.y + dy),
              w: rk.w,
              h: rk.h,
            };
          } else {
            nextRegions[k] = applyResize(
              start.region,
              dxTotal,
              dyTotal,
              start.resizeHandle ?? 'se'
            );
          }
          return { ...prev, [currentFrameIndex]: nextRegions };
        });
        dragStartRef.current = { ...start, x: pos.x, y: pos.y, region: start.region };
      };

      const onUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== dragStartRef.current?.pointerId) return;
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        setActiveRegion(null);
        dragStartRef.current = null;
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    },
    [regions, currentFrameIndex, doClientToNormalized, applyResize]
  );

  const addArtifact = useCallback(() => {
    const defaultArtifact: ArtifactRegion = {
      name: 'Nouveau',
      x: 0.35,
      y: 0.2,
      w: 0.2,
      h: 0.15,
      cornerStyle: 'square',
    };
    setArtifactsByFrame((prev) => {
      const list = prev[currentFrameIndex] ?? [];
      return { ...prev, [currentFrameIndex]: [...list, defaultArtifact] };
    });
  }, [currentFrameIndex]);

  const addArtifactWithName = useCallback(
    (name: string) => {
      const trimmed = name.trim() || 'Nouveau';
      const newArtifact: ArtifactRegion = {
        name: trimmed,
        x: 0.35,
        y: 0.2,
        w: 0.2,
        h: 0.15,
        cornerStyle: 'square',
      };
      setArtifactsByFrame((prev) => {
        const list = prev[currentFrameIndex] ?? [];
        return { ...prev, [currentFrameIndex]: [...list, newArtifact] };
      });
    },
    [currentFrameIndex]
  );

  /** Noms d’artefacts déjà utilisés dans le clip (toutes frames) — pour les chips de réutilisation */
  const removeArtifactByNameFromAllFrames = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setArtifactsByFrame((prev) => {
      const next: Record<number, ArtifactRegion[]> = {};
      for (const [fi, list] of Object.entries(prev)) {
        const filtered = list.filter((a) => a.name?.trim() !== trimmed);
        if (filtered.length > 0) next[Number(fi)] = filtered;
      }
      return next;
    });
  }, []);

  const existingArtifactNames = (() => {
    const names = new Set<string>();
    for (const list of Object.values(artifactsByFrame)) {
      for (const a of list) {
        if (a.name?.trim()) names.add(a.name.trim());
      }
    }
    return Array.from(names).sort();
  })();

  const removeArtifact = useCallback(
    (index: number) => {
      setArtifactsByFrame((prev) => {
        const list = prev[currentFrameIndex] ?? [];
        const next = list.filter((_, i) => i !== index);
        if (next.length === 0) {
          const { [currentFrameIndex]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [currentFrameIndex]: next };
      });
    },
    [currentFrameIndex]
  );

  const setArtifactName = useCallback(
    (index: number, name: string) => {
      setArtifactsByFrame((prev) => {
        const list = prev[currentFrameIndex] ?? [];
        const next = list.map((a, i) => (i === index ? { ...a, name: name.trim() || a.name } : a));
        return { ...prev, [currentFrameIndex]: next };
      });
    },
    [currentFrameIndex]
  );

  const handleArtifactPointerDown = useCallback(
    (e: React.PointerEvent, index: number, mode: 'move' | 'resize', handle?: ResizeHandle) => {
      e.preventDefault();
      const list = currentArtifacts;
      const art = list[index];
      if (!art) return;
      const { x, y } = doClientToNormalized(e.clientX, e.clientY);
      dragArtifactRef.current = {
        x,
        y,
        initialX: x,
        initialY: y,
        artifact: { ...art },
        pointerId: e.pointerId,
        mode,
        index,
        resizeHandle: mode === 'resize' ? (handle ?? 'se') : undefined,
      };
      const onMove = (moveEvent: PointerEvent) => {
        const start = dragArtifactRef.current;
        if (!start || moveEvent.pointerId !== start.pointerId || start.index !== index) return;
        const pos = doClientToNormalized(moveEvent.clientX, moveEvent.clientY);
        const dx = pos.x - start.x;
        const dy = pos.y - start.y;
        const dxTotal = pos.x - start.initialX;
        const dyTotal = pos.y - start.initialY;
        setArtifactsByFrame((prev) => {
          const list = prev[currentFrameIndex] ?? [];
          const a = list[index];
          if (!a) return prev;
          const next = [...list];
          if (start.mode === 'move') {
            next[index] = {
              ...a,
              x: clamp01(a.x + dx),
              y: clamp01(a.y + dy),
            };
          } else {
            next[index] = applyArtifactResize(
              start.artifact,
              dxTotal,
              dyTotal,
              start.resizeHandle ?? 'se'
            );
          }
          return { ...prev, [currentFrameIndex]: next };
        });
        dragArtifactRef.current = { ...start, x: pos.x, y: pos.y, artifact: start.artifact };
      };
      const onUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== dragArtifactRef.current?.pointerId) return;
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        dragArtifactRef.current = null;
      };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    },
    [currentArtifacts, currentFrameIndex, doClientToNormalized, applyArtifactResize]
  );

  const handleSave = useCallback(() => {
    const byFrameStr: Record<string, FaceRegions> = {};
    for (const [k, v] of Object.entries(regionsByFrame)) {
      byFrameStr[String(k)] = v;
    }
    const artifactsStr: Record<string, ArtifactRegion[]> = {};
    for (const [k, v] of Object.entries(artifactsByFrame)) {
      if (v.length > 0) artifactsStr[String(k)] = v;
    }
    onSave?.({ faceRegionsByFrame: byFrameStr, artifactsByFrame: artifactsStr });
  }, [onSave, regionsByFrame, artifactsByFrame]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Choisissez la frame avec le curseur, puis positionnez les cadres (œil gauche, œil droit,
        bouche) pour cette frame. Vous pouvez définir des régions différentes par frame. Image ou
        vidéo : la frame courante est affichée.
      </p>

      <FrameControls
        currentFrameIndex={currentFrameIndex}
        totalFrames={totalFrames}
        framesManaged={framesManaged}
        onGoToFrame={goToFrame}
      />

      <ArtifactsPanel
        currentFrameIndex={currentFrameIndex}
        currentArtifacts={currentArtifacts}
        existingArtifactNames={existingArtifactNames}
        onAddArtifact={addArtifact}
        onAddArtifactWithName={addArtifactWithName}
        onRemoveArtifact={removeArtifact}
        onRemoveArtifactByNameFromAllFrames={removeArtifactByNameFromAllFrames}
        onSetArtifactName={setArtifactName}
      />

      <div className="flex flex-wrap items-start gap-4">
        {/* Éditeur : image + overlay des régions */}
        <div
          ref={frameContainerRef}
          className="relative inline-block max-w-full rounded-md bg-black/80"
        >
          {isImage ? (
            <img
              src={clip.previewUrl!}
              alt="Frame"
              className="block max-h-[320px] max-w-full rounded"
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setMainMediaAspect({ w: img.naturalWidth, h: img.naturalHeight });
                }
              }}
            />
          ) : (
            <video
              ref={videoRef}
              src={clip.previewUrl!}
              muted
              playsInline
              className="block max-h-[320px] max-w-full rounded"
              preload="metadata"
              onLoadedMetadata={() => {
                const v = videoRef.current;
                if (v && Number.isFinite(v.duration)) {
                  videoDurationRef.current = v.duration;
                  const t = totalFrames > 0 ? (currentFrameIndex / totalFrames) * v.duration : 0;
                  v.currentTime = t;
                  v.pause();
                }
                if (v?.videoWidth && v?.videoHeight) {
                  setMainMediaAspect({ w: v.videoWidth, h: v.videoHeight });
                }
              }}
            />
          )}
        <RegionOverlay
          ref={overlayRef}
          regions={regions}
          currentArtifacts={currentArtifacts}
          onFaceRegionPointerDown={handlePointerDown}
          onArtifactPointerDown={handleArtifactPointerDown}
          onRemoveArtifact={removeArtifact}
        />
        </div>

        {/* Aperçu fond vert : mêmes dimensions que la frame */}
        <RealtimePreview
          previewUrl={clip.previewUrl!}
          regions={regions}
          artifacts={currentArtifacts}
          mainMediaAspect={mainMediaAspect}
          frameWidth={frameSize.width}
          frameHeight={frameSize.height}
          isImage={isImage}
          currentFrameIndex={currentFrameIndex}
          totalFrames={totalFrames}
          isPreviewPlaying={isPreviewPlaying}
          onTogglePlay={togglePreviewPlay}
          onLoadedMetadata={(width, height, duration) => {
            setMainMediaAspect({ w: width, h: height });
            videoDurationRef.current = duration;
          }}
          videoRef={realtimePreviewVideoRef}
        />
      </div>

      <RegionsFrameList
        totalFrames={totalFrames}
        regionsByFrame={regionsByFrame}
        artifactsByFrame={artifactsByFrame}
        currentFrameIndex={currentFrameIndex}
        onGoToFrame={goToFrame}
        frameListRefs={frameListRefs}
        previewUrl={clip.previewUrl!}
        isImage={isImage}
        durationS={clip.durationS ?? undefined}
      />


      <div className="flex flex-wrap items-center gap-2">
        {onSave && (
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || (!allFramesManaged && Object.values(artifactsByFrame).every((a) => a.length === 0))}
            title={
              !allFramesManaged && Object.values(artifactsByFrame).every((a) => a.length === 0)
                ? `Définir les régions pour les ${totalFrames - framesManaged} frame(s) restante(s) ou ajouter des artefacts`
                : undefined
            }
          >
            {isSaving
              ? 'Enregistrement…'
              : allFramesManaged || Object.values(artifactsByFrame).some((a) => a.length > 0)
                ? 'Enregistrer régions et artefacts'
                : `Enregistrer (${totalFrames - framesManaged} frame(s) restante(s))`}
          </Button>
        )}
        {onGenerateRegionImages && (
          <Button
            type="button"
            variant="outline"
            onClick={onGenerateRegionImages}
            disabled={isGeneratingRegionImages || isSaving}
            title="Génère une image (fond noir + région blanche) par région, envoi sur Cloudflare et enregistre l’URL en base"
          >
            {isGeneratingRegionImages ? 'Génération…' : 'Générer les images des régions'}
          </Button>
        )}
      </div>
    </div>
  );
}
