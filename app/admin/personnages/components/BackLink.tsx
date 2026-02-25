import Link from 'next/link';

export function BackLink() {
  return (
    <div className="mb-6">
      <Link
        href="/admin/personnages"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Retour aux personnages
      </Link>
    </div>
  );
}
