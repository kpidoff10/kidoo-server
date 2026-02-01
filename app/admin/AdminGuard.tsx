'use client';

/**
 * Guard admin : redirige vers /admin/login si non connecté, vers /admin/forbidden si non admin
 * Affiche une sidebar à gauche pour les pages protégées
 */

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './contexts';
import { AdminSidebar } from './components/AdminSidebar';

const PUBLIC_PATHS = ['/admin/login', '/admin/forbidden'];

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, isAuthenticated, isAdmin } = useAuth();

  const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (isPublic) return;
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/admin/login');
      return;
    }
    if (!isAdmin) {
      router.replace('/admin/forbidden');
    }
  }, [isPublic, isLoading, isAuthenticated, isAdmin, router]);

  if (isPublic) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
