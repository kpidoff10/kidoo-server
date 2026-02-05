'use client';

import type { CharacterClipDetail } from '../../../../../lib/charactersApi';

export interface ClipDetailInfoProps {
  clip: CharacterClipDetail;
}

export function ClipDetailInfo({ clip }: ClipDetailInfoProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
      <dl className="grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">ID</dt>
          <dd className="font-mono text-foreground">{clip.id}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Émotion</dt>
          <dd className="text-foreground">
            {clip.emotion.key} — {clip.emotion.label}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Statut</dt>
          <dd
            className={
              clip.status === 'READY'
                ? 'text-green-600 dark:text-green-400'
                : clip.status === 'FAILED'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
            }
          >
            {clip.status}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Poids</dt>
          <dd className="text-foreground">{clip.weight}</dd>
        </div>
        {clip.loopStartFrame != null && (
          <div>
            <dt className="text-muted-foreground">Début de boucle</dt>
            <dd className="text-foreground">Frame {clip.loopStartFrame + 1}</dd>
          </div>
        )}
        {clip.loopEndFrame != null && (
          <div>
            <dt className="text-muted-foreground">Fin de boucle</dt>
            <dd className="text-foreground">Frame {clip.loopEndFrame + 1}</dd>
          </div>
        )}
        {clip.prompt && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Prompt</dt>
            <dd className="text-foreground">{clip.prompt}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
