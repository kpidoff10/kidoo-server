'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { CharacterClipDetail } from '../../../lib/charactersApi';

export interface ClipDetailActionsProps {
  clip: CharacterClipDetail;
}

export function ClipDetailActions({ clip }: ClipDetailActionsProps) {
  const characterLink = `/admin/personnages/${clip.characterId}`;

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={characterLink}>Retour au personnage</Link>
      </Button>
      {clip.previewUrl && (
        <Button variant="outline" size="sm" asChild>
          <a href={clip.previewUrl} target="_blank" rel="noopener noreferrer">
            Ouvrir l’aperçu dans un nouvel onglet
          </a>
        </Button>
      )}
    </div>
  );
}
