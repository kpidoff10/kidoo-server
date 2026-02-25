'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { FaceRegions, ArtifactRegion } from '@/app/admin/lib/charactersApi';
import { REGION_LABELS } from '../../clip-face-regions-editor/constants';
import type { RegionKey } from '../../clip-face-regions-editor/constants';

const REGION_KEYS: RegionKey[] = ['leftEye', 'rightEye', 'mouth'];

interface FramesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalFrames: number;
  regionsByFrame: Record<number, FaceRegions>;
  artifactsByFrame: Record<number, ArtifactRegion[]>;
  onSelectFrame: (frameIndices: number[]) => void;
}

export function FramesDialog({
  open,
  onOpenChange,
  totalFrames,
  regionsByFrame,
  artifactsByFrame,
  onSelectFrame,
}: FramesDialogProps) {
  const [selectedFrames, setSelectedFrames] = useState<Set<number>>(new Set());
  const [reverseOrder, setReverseOrder] = useState(false);

  // Réinitialiser la sélection quand le dialog s'ouvre.
  // queueMicrotask évite l'appel setState synchrone dans l'effet (cascading renders).
  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setSelectedFrames(new Set());
        setReverseOrder(false);
      });
    }
  }, [open]);

  const handleToggleFrame = (frameIndex: number) => {
    setSelectedFrames((prev) => {
      const next = new Set(prev);
      if (next.has(frameIndex)) {
        next.delete(frameIndex);
      } else {
        next.add(frameIndex);
      }
      return next;
    });
  };

  const handleAddFrames = () => {
    if (selectedFrames.size > 0) {
      const sortedFrames = Array.from(selectedFrames).sort((a, b) => a - b);
      const finalFrames = reverseOrder ? sortedFrames.reverse() : sortedFrames;
      onSelectFrame(finalFrames);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl flex flex-col">
        <DialogHeader>
          <DialogTitle>Frames disponibles</DialogTitle>
          <DialogDescription>
            Sélectionnez les frames à ajouter à la timeline (utilisez les checkboxes).
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
              const isSelected = selectedFrames.has(i);
              return (
                <li
                  key={i}
                  className="flex cursor-pointer flex-col gap-1.5 px-3 py-2 text-left transition-colors hover:bg-muted/60"
                  onClick={() => handleToggleFrame(i)}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleFrame(i)}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                    />
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
        <DialogFooter className="flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {selectedFrames.size} frame{selectedFrames.size !== 1 ? 's' : ''} sélectionnée{selectedFrames.size !== 1 ? 's' : ''}
            </span>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={reverseOrder}
                onCheckedChange={(checked) => setReverseOrder(checked === true)}
              />
              <span className="text-foreground">Ordre inversé</span>
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleAddFrames}
              disabled={selectedFrames.size === 0}
            >
              Ajouter ({selectedFrames.size})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
