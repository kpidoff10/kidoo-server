'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCharacter, useUpdateCharacter, useDeleteCharacter } from '../../hooks/useCharacters';
import { AdminContent } from '@/components/ui/admin-content';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BackLink,
  CharacterForm,
  CharacterEmotionsTab,
  PersonnagesListLoading,
} from '../components';
import type { Character } from '../../lib/charactersApi';
import type { CharacterFormValues } from '../components';

function CharacterEditForm({
  character,
  id,
}: {
  character: Character;
  id: string;
}) {
  const router = useRouter();
  const updateMutation = useUpdateCharacter(id);
  const deleteMutation = useDeleteCharacter();

  const defaultValues: CharacterFormValues = {
    name: character.name ?? null,
    defaultImageUrl: character.defaultImageUrl ?? null,
    sex: character.sex as CharacterFormValues['sex'],
    personality: character.personality as CharacterFormValues['personality'],
    imageWidth: character.imageWidth ?? 240,
    imageHeight: character.imageHeight ?? 280,
  };

  const handleSubmit = async (data: CharacterFormValues) => {
    try {
      await updateMutation.mutateAsync({
        name: data.name ?? undefined,
        defaultImageUrl: data.defaultImageUrl ?? undefined,
        sex: data.sex,
        personality: data.personality,
        imageWidth: data.imageWidth,
        imageHeight: data.imageHeight,
      });
    } catch (err) {
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer ce personnage ?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      router.push('/admin/personnages');
    } catch {
      // Géré par error boundary ou affichage dans le formulaire
    }
  };

  return (
    <div className="mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Modifier</CardTitle>
          <CardDescription>Informations du personnage et émotions (cf. roadmap).</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="informations" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="informations">Informations</TabsTrigger>
              <TabsTrigger value="emotions">Émotions</TabsTrigger>
            </TabsList>
            <TabsContent value="informations" className="mt-4">
              <CharacterForm
                mode="edit"
                defaultValues={defaultValues}
                onSubmit={handleSubmit}
                error={updateMutation.isError ? updateMutation.error?.message ?? null : null}
                characterId={id}
                onImageUploaded={(url) => updateMutation.mutate({ defaultImageUrl: url })}
              >
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={deleteMutation.isPending}
                  onClick={handleDelete}
                >
                  {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
                </Button>
              </CharacterForm>
            </TabsContent>
            <TabsContent value="emotions" className="mt-4">
              <CharacterEmotionsTab characterId={id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPersonnageDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: character, isLoading, error } = useCharacter(id);

  if (isLoading || !character) {
    return <PersonnagesListLoading />;
  }

  if (error) {
    return (
      <AdminContent size="narrow">
        <p className="text-destructive">Erreur : {error.message}</p>
        <Link
          href="/admin/personnages"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Retour aux personnages
        </Link>
      </AdminContent>
    );
  }

  return (
    <AdminContent size="narrow">
      <BackLink />

      <h1 className="text-2xl font-bold text-foreground">{character.name ?? 'Sans nom'}</h1>
      <p className="mt-1 text-muted-foreground">
        Modifier l&apos;image, le sexe et la personnalité.
      </p>

      <CharacterEditForm key={character.id} character={character} id={id} />
    </AdminContent>
  );
}
