'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { FaceRegions, ArtifactRegion } from '../../../../../../../lib/charactersApi';
import { REGION_LABELS } from '../../clip-face-regions-editor/constants';
import type { RegionKey } from '../../clip-face-regions-editor/constants';

const REGION_KEYS: RegionKey[] = ['leftEye', 'rightEye', 'mouth'];

interface FramesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalFrames: number;
  regionsByFrame: Record<number, FaceRegions>;
  artifactsByFrame: Record<number, ArtifactRegion[]>;
  onSelectFrame: (frameIndex: number) => void;
}

export function FramesDialog({
  open,
  onOpenChange,
  totalFrames,
  regionsByFrame,
  artifactsByFrame,
  onSelectFrame,
}: FramesDialogProps) {
  const handleSelect = (frameIndex: number) => {
    onSelectFrame(frameIndex);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl flex flex-col">
        <DialogHeader>
          <DialogTitle>Frames disponibles</DialogTitle>
          <DialogDescription>
            Cliquez sur une frame pour l'ajouter à la timeline (frame complète).
          </DialogDescription>
        </DialogHeader>
        <div className="min-w-0 flex-1 overflow-y-auto rounded border border-border/60 bg-muted/30 p-2">
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
                  onClick={() => handleSelect(i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(i);
                    }
                  }}
                  className="flex cursor-pointer flex-col gap-1.5 px-3 py-2 text-left transition-colors hover:bg-muted/60 focus:bg-muted/50 focus:outline-none"
                >
                  <div className="flex flex-wrap items-center gap-3">
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
                  </div>
                  {(hasRegions || hasArtifacts) && (
                    <div
                      className="flex flex-wrap gap-2 pl-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {hasRegions &&
                        REGION_KEYS.map((key) => {
                          const r = frameRegions?.[key];
                          if (!r?.imageUrl) return null;
                          return (
                            <a
                              key={key}
                              href={r.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex flex-col gap-1 rounded border border-border/40 p-1.5 transition-all hover:border-primary/50 hover:shadow-sm"
                              title={`${REGION_LABELS[key]} - Cliquer pour ouvrir en grand`}
                            >
                              <span className="text-xs font-medium text-foreground">
                                {REGION_LABELS[key]}
                              </span>
                              <img
                                src={r.imageUrl}
                                alt={REGION_LABELS[key]}
                                className="h-16 w-16 rounded object-contain bg-black/5"
                              />
                            </a>
                          );
                        })}
                      {frameArtifacts.map((art, idx) =>
                        art.imageUrl ? (
                          <a
                            key={`art-url-${idx}`}
                            href={art.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col gap-1 rounded border border-border/40 p-1.5 transition-all hover:border-primary/50 hover:shadow-sm"
                            title={`${art.name || 'Artefact'} - Cliquer pour ouvrir en grand`}
                          >
                            <span className="text-xs font-medium text-foreground">
                              {art.name || 'Artefact'}
                            </span>
                            <img
                              src={art.imageUrl}
                              alt={art.name || 'Artefact'}
                              className="h-16 w-16 rounded object-contain bg-black/5"
                            />
                          </a>
                        ) : null
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
