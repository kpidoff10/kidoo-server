'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCreateCharacter } from '../../hooks/useCharacters';
import { charactersApi } from '../../lib/charactersApi';
import { AdminContent } from '@/components/ui/admin-content';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BackLink, CharacterForm } from '../components';
import type { CharacterFormValues } from '../components';

export default function AdminPersonnageNewPage() {
  const router = useRouter();
  const createMutation = useCreateCharacter();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CharacterFormValues) => {
    setError(null);
    try {
      const character = await createMutation.mutateAsync({
        name: data.name ?? undefined,
        defaultImageUrl: data.defaultImageUrl ?? undefined,
        sex: data.sex,
        personality: data.personality,
        imageWidth: data.imageWidth,
        imageHeight: data.imageHeight,
      });

      if (pendingFile) {
        const uploadRes = await charactersApi.uploadImage(character.id, pendingFile);
        if (uploadRes.success) {
          await charactersApi.update(character.id, { defaultImageUrl: uploadRes.publicUrl });
        }
      }

      router.push(`/admin/personnages/${character.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  return (
    <AdminContent size="narrow">
      <BackLink />

      <h1 className="text-2xl font-bold text-foreground">Nouveau personnage</h1>
      <p className="mt-1 text-muted-foreground">
        Ajoutez un personnage avec une image par défaut, un sexe et une personnalité.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Informations</CardTitle>
          <CardDescription>Nom, image, sexe et caractère par défaut.</CardDescription>
        </CardHeader>
        <CardContent>
          <CharacterForm
            mode="create"
            onSubmit={handleSubmit}
            error={error}
            pendingFile={pendingFile}
            onPendingFileChange={setPendingFile}
          >
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Création…' : 'Créer le personnage'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/personnages">Annuler</Link>
            </Button>
          </CharacterForm>
        </CardContent>
      </Card>
    </AdminContent>
  );
}
