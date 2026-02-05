'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import type { CharacterClipDetail, FaceRegions, ArtifactRegion } from '../../../../lib/charactersApi';
import { REGION_LABELS } from '../clip-face-regions-editor/constants';
import type { RegionKey } from '../clip-face-regions-editor/constants';

const REGION_KEYS: RegionKey[] = ['leftEye', 'rightEye', 'mouth'];

export interface ClipVideoCreationProps {
  clip: CharacterClipDetail;
}

export function ClipVideoCreation({ clip }: ClipVideoCreationProps) {
  const fps = clip.fps ?? 30;
  const totalFrames = useMemo(
    () =>
      Math.max(
        1,
        clip.frames ?? (clip.durationS ? Math.ceil(clip.durationS * fps) : 1)
      ),
    [clip.frames, clip.durationS, fps]
  );

  const regionsByFrame = useMemo(() => {
    const out: Record<number, FaceRegions> = {};
    if (clip.faceRegionsByFrame) {
      for (const [k, v] of Object.entries(clip.faceRegionsByFrame)) {
        const i = parseInt(k, 10);
        if (!Number.isNaN(i) && v) out[i] = v;
      }
    }
    return out;
  }, [clip.faceRegionsByFrame]);

  const artifactsByFrame = useMemo(() => {
    const out: Record<number, ArtifactRegion[]> = {};
    if (clip.artifactsByFrame) {
      for (const [k, v] of Object.entries(clip.artifactsByFrame)) {
        const i = parseInt(k, 10);
        if (!Number.isNaN(i) && Array.isArray(v)) out[i] = v;
      }
    }
    return out;
  }, [clip.artifactsByFrame]);

  const handleAddFullFrame = (frameIndex: number) => {
    // TODO: ajouter la frame complète à la timeline
    void frameIndex;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <span className="text-sm font-medium text-foreground">Actions</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          title="Choisir une frame dans la liste ci-dessous pour l'ajouter en frame complète"
          aria-label="Ajouter une frame complète"
        >
          <span className="mr-1.5 text-base leading-none">+</span>
          Frame complète
        </Button>
      </div>

      <div className="min-w-0 rounded-lg border border-border bg-muted/30 p-3">
        <h4 className="mb-2 text-sm font-medium text-foreground">
          Frames disponibles
        </h4>
        <p className="mb-2 text-xs text-muted-foreground">
          Cliquez sur une frame pour l’ajouter à la timeline (frame complète).
        </p>
        <div className="max-h-64 overflow-y-auto rounded border border-border/60 bg-background/50 lg:max-h-[320px]">
          <ul className="divide-y divide-border/60">
            {Array.from({ length: totalFrames }, (_, i) => {
              const frameRegions = regionsByFrame[i];
              const frameArtifacts = artifactsByFrame[i] ?? [];
              const hasRegions = frameRegions != null;
              const hasArtifacts = frameArtifacts.length > 0;
              const hasAny = hasRegions || hasArtifacts;
              return (
                <li
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleAddFullFrame(i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleAddFullFrame(i);
                    }
                  }}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/60 focus:bg-muted/50 focus:outline-none"
                >
                  <span className="shrink-0 text-sm font-medium text-foreground">
                    Frame {i}
                  </span>
                  <span className="flex flex-1 flex-wrap gap-1">
                    {hasRegions &&
                      REGION_KEYS.map((key) => (
                        <span
                          key={key}
                          className="rounded px-1.5 py-0.5 text-xs font-medium text-foreground"
                          style={{
                            backgroundColor: 'rgba(59, 130, 246, 0.25)',
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
                          backgroundColor: 'rgba(147, 51, 234, 0.3)',
                          color: 'rgba(255,255,255,0.95)',
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
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Ajouter
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Aperçu et timeline — à venir.
      </p>
    </div>
  );
}
