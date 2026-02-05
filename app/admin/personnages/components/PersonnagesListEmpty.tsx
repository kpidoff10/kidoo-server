import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function PersonnagesListEmpty() {
  return (
    <div className="mt-8 rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
      <p className="text-muted-foreground">Aucun personnage.</p>
      <Button asChild className="mt-4">
        <Link href="/admin/personnages/new">Créer le premier personnage</Link>
      </Button>
    </div>
  );
}
