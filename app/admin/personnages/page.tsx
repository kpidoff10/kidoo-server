'use client';

import Link from 'next/link';
import { useCharacters } from '../hooks/useCharacters';
import { AdminContent } from '@/components/ui/admin-content';
import { Button } from '@/components/ui/button';
import {
  CharacterCard,
  PersonnagesListEmpty,
  PersonnagesListError,
  PersonnagesListLoading,
} from './components';

export default function AdminPersonnagesPage() {
  const { data: characters, isLoading, error } = useCharacters();

  if (isLoading) {
    return <PersonnagesListLoading />;
  }

  if (error) {
    return <PersonnagesListError message={error.message} />;
  }

  return (
    <AdminContent>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Personnages</h1>
          <p className="mt-1 text-muted-foreground">
            Gérez les personnages (image, sexe, personnalité).
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/personnages/new">Ajouter un personnage</Link>
        </Button>
      </div>

      {!characters?.length ? (
        <PersonnagesListEmpty />
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((c) => (
            <CharacterCard key={c.id} character={c} />
          ))}
        </div>
      )}
    </AdminContent>
  );
}
