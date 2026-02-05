'use client';

import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface CharacterPreviewCardProps {
  defaultImageUrl: string;
  name: string;
}

export function CharacterPreviewCard({ defaultImageUrl, name }: CharacterPreviewCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aperçu</CardTitle>
        <CardDescription>Image par défaut du personnage.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
          {defaultImageUrl ? (
            <Image
              src={defaultImageUrl}
              alt={name || 'Personnage'}
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
      </CardContent>
    </Card>
  );
}
