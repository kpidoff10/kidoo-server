import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function PostsListEmpty() {
  return (
    <div className="mt-8 rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
      <p className="text-muted-foreground">Aucune actualité.</p>
      <Button asChild className="mt-4">
        <Link href="/admin/posts/new">Créer la première actualité</Link>
      </Button>
    </div>
  );
}
