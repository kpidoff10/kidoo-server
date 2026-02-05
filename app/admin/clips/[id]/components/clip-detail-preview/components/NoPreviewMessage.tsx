'use client';

import type { CharacterClipDetail } from '../../../../../lib/charactersApi';

export interface NoPreviewMessageProps {
  clip: Pick<CharacterClipDetail, 'status'>;
}

export function NoPreviewMessage({ clip }: NoPreviewMessageProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-sm text-muted-foreground">
        Aucune prévisualisation disponible pour ce clip.
        {clip.status === 'GENERATING' &&
          ' Le clip est peut‑être encore en cours de génération.'}
      </p>
    </div>
  );
}
