'use client';

import Link from 'next/link';
import type { CharacterClipDetail } from '../../../../../lib/charactersApi';

export interface ClipDetailBreadcrumbProps {
  clip: CharacterClipDetail;
}

export function ClipDetailBreadcrumb({ clip }: ClipDetailBreadcrumbProps) {
  const characterLink = `/admin/personnages/${clip.characterId}`;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Link href="/admin/personnages" className="text-sm text-muted-foreground hover:text-foreground">
        ← Personnages
      </Link>
      <span className="text-muted-foreground">/</span>
      <Link href={characterLink} className="text-sm text-muted-foreground hover:text-foreground">
        {clip.character.name ?? clip.characterId}
      </Link>
      <span className="text-muted-foreground">/</span>
      <span className="text-sm font-medium text-foreground">Clip {clip.emotion.key}</span>
    </div>
  );
}
