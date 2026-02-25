'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SEX_LABELS, PERSONALITY_LABELS } from './constants';
import type { Character } from '../../lib/charactersApi';

export interface CharacterCardProps {
  character: Character;
}

export function CharacterCard({ character }: CharacterCardProps) {
  return (
    <Link href={`/admin/personnages/${character.id}`}>
      <Card
        className={cn(
          'h-full flex flex-col overflow-hidden transition-colors hover:bg-accent/50'
        )}
      >
        <div className="aspect-square w-full shrink-0 bg-muted">
          {character.defaultImageUrl ? (
            <Image
              src={character.defaultImageUrl}
              alt={character.name ?? 'Personnage'}
              width={400}
              height={400}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl text-muted-foreground">
              ?
            </div>
          )}
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="truncate text-lg">
            {character.name ?? 'Sans nom'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {SEX_LABELS[character.sex] ?? character.sex} ·{' '}
            {PERSONALITY_LABELS[character.personality] ?? character.personality}
          </p>
        </CardHeader>
      </Card>
    </Link>
  );
}
