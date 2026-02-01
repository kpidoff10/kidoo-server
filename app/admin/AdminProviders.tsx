'use client';

/**
 * Providers pour l'espace admin : SessionProvider (NextAuth) + AdminAuthProvider
 */

import { SessionProvider } from 'next-auth/react';
import { AdminAuthProvider } from './contexts';

interface AdminProvidersProps {
  children: React.ReactNode;
}

export function AdminProviders({ children }: AdminProvidersProps) {
  return (
    <SessionProvider>
      <AdminAuthProvider>{children}</AdminAuthProvider>
    </SessionProvider>
  );
}
