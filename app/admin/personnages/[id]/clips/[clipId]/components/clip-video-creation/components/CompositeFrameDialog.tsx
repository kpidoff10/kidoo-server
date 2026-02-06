'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { FaceRegions, ArtifactRegion } from '../../../../../../../lib/charactersApi';
import type { TimelineRegion, TimelineArtifact } from '../../../../../../../types/emotion-video';
import { FramePreview } from './FramePreview';

interface CompositeFrameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalFrames: number;
  regionsByFrame: Record<number, FaceRegions>;
  artifactsByFrame: Record<number, ArtifactRegion[]>;
  lastCompositeFrame: {
    regions: {
      leftEye?: TimelineRegion;
      rightEye?: TimelineRegion;
      mouth?: TimelineRegion;
    };
    artifacts: TimelineArtifact[];
  } | null;
  isEditMode?: boolean;
  onCreateCompositeFrame: (regions: {
    leftEye?: TimelineRegion;
    rightEye?: TimelineRegion;
    mouth?: TimelineRegion;
  }, artifacts: TimelineArtifact[]) => void;
}

type RegionKey = 'leftEye' | 'rightEye' | 'mouth';

export function CompositeFrameDialog({
  open,
  onOpenChange,
  totalFrames,
  regionsByFrame,
  artifactsByFrame,
  lastCompositeFrame,
  isEditMode = false,
  onCreateCompositeFrame,
}: CompositeFrameDialogProps) {
  const [selectedRegions, setSelectedRegions] = useState<{
    leftEye?: TimelineRegion;
    rightEye?: TimelineRegion;
    mouth?: TimelineRegion;
  }>({});
  const [selectedArtifacts, setSelectedArtifacts] = useState<TimelineArtifact[]>([]);

  // Pré-remplir les régions et artefacts quand le dialog s'ouvre avec lastCompositeFrame
  useEffect(() => {
    if (open && lastCompositeFrame) {
      setSelectedRegions(lastCompositeFrame.regions || {});
      setSelectedArtifacts(lastCompositeFrame.artifacts || []);
    } else if (!open) {
      // Réinitialiser quand le dialog se ferme
      setSelectedRegions({});
      setSelectedArtifacts([]);
    }
  }, [open, lastCompositeFrame]);

  const handleSelectRegion = (key: RegionKey, sourceFrameIndex: number) => {
    const sourceRegions = regionsByFrame[sourceFrameIndex];
    if (!sourceRegions || !sourceRegions[key]) return;

    const region = sourceRegions[key];
    if (!region) return;

    setSelectedRegions(prev => ({
      ...prev,
      [key]: {
        sourceFrameIndex,
        x: region.x,
        y: region.y,
        w: region.w,
        h: region.h,
        imageUrl: region.imageUrl,
      },
    }));
  };

  const handleRemoveRegion = (key: RegionKey) => {
    setSelectedRegions(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleAddArtifact = (sourceFrameIndex: number, artifactIndex: number) => {
    const sourceArtifacts = artifactsByFrame[sourceFrameIndex];
    if (!sourceArtifacts || !sourceArtifacts[artifactIndex]) return;

    const artifact = sourceArtifacts[artifactIndex];
    setSelectedArtifacts(prev => [
      ...prev,
      {
        sourceFrameIndex,
        artifactIndex,
        name: artifact.name,
        x: artifact.x,
        y: artifact.y,
        w: artifact.w,
        h: artifact.h,
        imageUrl: artifact.imageUrl,
      },
    ]);
  };

  const handleRemoveArtifact = (index: number) => {
    setSelectedArtifacts(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    if (Object.keys(selectedRegions).length === 0 && selectedArtifacts.length === 0) {
      alert('Veuillez sélectionner au moins une région ou un artefact');
      return;
    }

    onCreateCompositeFrame(selectedRegions, selectedArtifacts);

    // Reset
    setSelectedRegions({});
    setSelectedArtifacts([]);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedRegions({});
    setSelectedArtifacts([]);
    onOpenChange(false);
  };

  const handleReuseLastComposition = () => {
    if (!lastCompositeFrame) return;
    setSelectedRegions(lastCompositeFrame.regions);
    setSelectedArtifacts([...lastCompositeFrame.artifacts]);
  };

  // Construire les données pour l'aperçu
  const previewRegions: FaceRegions = {
    leftEye: selectedRegions.leftEye ? {
      x: selectedRegions.leftEye.x,
      y: selectedRegions.leftEye.y,
      w: selectedRegions.leftEye.w,
      h: selectedRegions.leftEye.h,
      imageUrl: selectedRegions.leftEye.imageUrl,
    } : undefined,
    rightEye: selectedRegions.rightEye ? {
      x: selectedRegions.rightEye.x,
      y: selectedRegions.rightEye.y,
      w: selectedRegions.rightEye.w,
      h: selectedRegions.rightEye.h,
      imageUrl: selectedRegions.rightEye.imageUrl,
    } : undefined,
    mouth: selectedRegions.mouth ? {
      x: selectedRegions.mouth.x,
      y: selectedRegions.mouth.y,
      w: selectedRegions.mouth.w,
      h: selectedRegions.mouth.h,
      imageUrl: selectedRegions.mouth.imageUrl,
    } : undefined,
  };

  const previewArtifacts: ArtifactRegion[] = selectedArtifacts.map(a => ({
    name: a.name,
    x: a.x,
    y: a.y,
    w: a.w,
    h: a.h,
    imageUrl: a.imageUrl,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Modifier la frame composite' : 'Créer une frame composite'}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-6">
          {/* Aperçu à gauche */}
          <div className="flex shrink-0 flex-col gap-3" style={{ width: '280px', maxHeight: '600px' }}>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {/* Bouton pour réutiliser la dernière composition */}
              {lastCompositeFrame && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReuseLastComposition}
                  className="w-full gap-2"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M3 21v-5h5" />
                  </svg>
                  Réutiliser
                </Button>
              )}

              {/* Aperçu de la composition */}
              <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-gradient-to-br from-zinc-950 to-zinc-900 p-3">
                <span className="text-xs font-medium text-foreground">Aperçu</span>
                <FramePreview
                  width={200}
                  height={233}
                  faceRegions={previewRegions}
                  artifacts={previewArtifacts}
                  className="rounded-lg border-2 border-zinc-700 shadow-2xl"
                />
              </div>

              {/* Régions sélectionnées */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Sélectionné :</span>
                <div className="flex max-h-[150px] flex-col gap-1.5 overflow-y-auto text-xs">
                {selectedRegions.leftEye && (
                  <div className="flex items-center justify-between rounded bg-blue-500/20 px-2 py-1">
                    <span className="text-[11px]">👁️ Œil G (F{selectedRegions.leftEye.sourceFrameIndex + 1})</span>
                    <button
                      onClick={() => handleRemoveRegion('leftEye')}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </div>
                )}
                {selectedRegions.rightEye && (
                  <div className="flex items-center justify-between rounded bg-blue-500/20 px-2 py-1">
                    <span className="text-[11px]">👁️ Œil D (F{selectedRegions.rightEye.sourceFrameIndex + 1})</span>
                    <button
                      onClick={() => handleRemoveRegion('rightEye')}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </div>
                )}
                {selectedRegions.mouth && (
                  <div className="flex items-center justify-between rounded bg-purple-500/20 px-2 py-1">
                    <span className="text-[11px]">👄 Bouche (F{selectedRegions.mouth.sourceFrameIndex + 1})</span>
                    <button
                      onClick={() => handleRemoveRegion('mouth')}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </div>
                )}
                {selectedArtifacts.map((art, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded bg-orange-500/20 px-2 py-1">
                    <span className="text-[11px] truncate">{art.name} (F{art.sourceFrameIndex! + 1})</span>
                    <button
                      onClick={() => handleRemoveArtifact(idx)}
                      className="ml-1 text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {Object.keys(selectedRegions).length === 0 && selectedArtifacts.length === 0 && (
                  <span className="text-[11px] text-muted-foreground italic">Aucune sélection</span>
                )}
              </div>
              </div>
            </div>

            {/* Actions - toujours visibles en bas */}
            <div className="flex shrink-0 flex-col gap-2 border-t border-border pt-3">
              <Button type="button" variant="default" onClick={handleCreate} className="w-full">
                {isEditMode ? 'Modifier la frame' : 'Créer la frame'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} className="w-full">
                Annuler
              </Button>
            </div>
          </div>

          {/* Sélection des frames à droite */}
          <div className="flex-1 space-y-3 overflow-hidden">
            <h3 className="text-sm font-medium text-foreground">Sélectionner des régions depuis les frames</h3>
            <div className="grid max-h-[600px] grid-cols-2 gap-3 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: totalFrames }, (_, i) => i).map((frameIndex) => {
                const regions = regionsByFrame[frameIndex];
                const artifacts = artifactsByFrame[frameIndex] || [];
                const hasContent = regions || artifacts.length > 0;

                if (!hasContent) return null;

                return (
                  <div
                    key={frameIndex}
                    className="space-y-1.5 rounded-lg border border-border bg-background p-2"
                  >
                    <div className="text-center">
                      <span className="text-[10px] font-medium text-muted-foreground">F{frameIndex + 1}</span>
                    </div>

                    {/* Aperçu miniature */}
                    <div className="flex justify-center">
                      <FramePreview
                        width={64}
                        height={75}
                        faceRegions={regions || null}
                        artifacts={artifacts}
                        className="rounded border border-border"
                      />
                    </div>

                    {/* Boutons de sélection des régions en grille compacte */}
                    {regions && (
                      <div className="grid grid-cols-2 gap-1">
                        {regions.leftEye && (
                          <button
                            type="button"
                            className="rounded bg-blue-500/10 px-1.5 py-1 text-[10px] transition-colors hover:bg-blue-500/20"
                            onClick={() => handleSelectRegion('leftEye', frameIndex)}
                            title="Œil gauche"
                          >
                            👁️G
                          </button>
                        )}
                        {regions.rightEye && (
                          <button
                            type="button"
                            className="rounded bg-blue-500/10 px-1.5 py-1 text-[10px] transition-colors hover:bg-blue-500/20"
                            onClick={() => handleSelectRegion('rightEye', frameIndex)}
                            title="Œil droit"
                          >
                            👁️D
                          </button>
                        )}
                        {regions.mouth && (
                          <button
                            type="button"
                            className="col-span-2 rounded bg-purple-500/10 px-1.5 py-1 text-[10px] transition-colors hover:bg-purple-500/20"
                            onClick={() => handleSelectRegion('mouth', frameIndex)}
                            title="Bouche"
                          >
                            👄 Bouche
                          </button>
                        )}
                      </div>
                    )}

                    {/* Boutons de sélection des artefacts */}
                    {artifacts.length > 0 && (
                      <div className="space-y-1">
                        {artifacts.map((art, artIdx) => (
                          <button
                            key={artIdx}
                            type="button"
                            className="w-full truncate rounded bg-orange-500/10 px-1.5 py-1 text-[10px] transition-colors hover:bg-orange-500/20"
                            onClick={() => handleAddArtifact(frameIndex, artIdx)}
                            title={art.name}
                          >
                            {art.name || `Art ${artIdx + 1}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
