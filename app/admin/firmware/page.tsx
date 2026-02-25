'use client';

import Link from 'next/link';
import { KIDOO_MODELS } from '@kidoo/shared';
import { AdminContent } from '@/components/ui/admin-content';

export default function AdminFirmwarePage() {
  return (
    <AdminContent>
      <h1 className="text-2xl font-bold text-foreground">Firmware</h1>
      <p className="mt-2 text-muted-foreground">
        Sélectionnez un modèle pour gérer son firmware.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {KIDOO_MODELS.map((model) => (
          <Link
            key={model.id}
            href={`/admin/firmware/${model.id}`}
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
          >
            <h2 className="font-semibold text-foreground">{model.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {model.description}
            </p>
          </Link>
        ))}
      </div>
    </AdminContent>
  );
}
