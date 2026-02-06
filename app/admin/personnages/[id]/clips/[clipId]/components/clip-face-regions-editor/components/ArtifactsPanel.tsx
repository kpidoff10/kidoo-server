'use client';

import { Button } from '@/components/ui/button';
import { ARTIFACT_BORDER } from '../constants';
import { ArtifactRegion } from '../types';

export interface ArtifactsPanelProps {
  currentFrameIndex: number;
  currentArtifacts: ArtifactRegion[];
  existingArtifactNames: string[];
  onAddArtifact: () => void;
  onAddArtifactWithName: (name: string) => void;
  onRemoveArtifact: (index: number) => void;
  onRemoveArtifactByNameFromAllFrames: (name: string) => void;
  onSetArtifactName: (index: number, name: string) => void;
}

export function ArtifactsPanel({
  currentFrameIndex,
  currentArtifacts,
  existingArtifactNames,
  onAddArtifact,
  onAddArtifactWithName,
  onRemoveArtifact,
  onRemoveArtifactByNameFromAllFrames,
  onSetArtifactName,
}: ArtifactsPanelProps) {
  return (
    <div className="rounded-lg border border-violet-500/40 bg-violet-950/20 p-3">
      <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: ARTIFACT_BORDER }}
          aria-hidden
        />
        Artefacts (frame {currentFrameIndex + 1})
      </h4>
      <p className="mb-2 text-xs text-muted-foreground">
        Déclarez des zones nommées (ex. effet &quot;zzz&quot;) en violet pour les réutiliser.
        Glissez pour positionner/redimensionner sur l’image.
      </p>
      <ul className="mb-2 space-y-2">
        {currentArtifacts.map((art, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <input
              type="text"
              value={art.name}
              onChange={(e) => onSetArtifactName(idx, e.target.value)}
              placeholder="Nom (ex. zzz)"
              className="h-8 flex-1 rounded border border-border bg-background px-2 text-sm"
            />
            <button
              type="button"
              onClick={() => onRemoveArtifact(idx)}
              className="rounded border border-red-500/60 bg-red-950/40 px-2 py-1 text-xs text-red-200 hover:bg-red-950/60"
            >
              Supprimer
            </button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAddArtifact}
        className="border-violet-500/50 text-violet-200 hover:bg-violet-900/30"
      >
        + Ajouter un artefact
      </Button>
      {existingArtifactNames.length > 0 && (
        <div className="mt-3 border-t border-violet-500/30 pt-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Réutiliser un nom déjà utilisé :
          </p>
          <div className="flex flex-wrap gap-1.5">
            {existingArtifactNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-0.5 rounded-full border border-violet-500/60 bg-violet-900/40 pr-1.5 pl-2.5 py-1 text-xs font-medium text-violet-200"
              >
                <button
                  type="button"
                  onClick={() => onAddArtifactWithName(name)}
                  className="hover:underline focus:outline-none"
                >
                  {name}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveArtifactByNameFromAllFrames(name);
                  }}
                  title={`Supprimer « ${name} » de toutes les frames`}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-violet-300 transition-colors hover:bg-red-500/80 hover:text-white"
                  aria-label={`Supprimer ${name} de toutes les frames`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
