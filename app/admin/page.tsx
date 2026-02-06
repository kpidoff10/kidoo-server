'use client';

import { AdminContent } from '@/components/ui/admin-content';

/**
 * Dashboard admin - accueil de l'espace administrateur
 */

export default function AdminDashboardPage() {
  return (
    <AdminContent>
      <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
      <p className="mt-2 text-muted-foreground">
        Bienvenue dans l&apos;espace administrateur. Les fonctionnalités (ex. upload firmware) seront ajoutées ici.
      </p>
    </AdminContent>
  );
}
