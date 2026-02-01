'use client';

/**
 * Providers pour l'espace admin : SessionProvider + AdminAuthProvider + QueryClientProvider
 */

import { SessionProvider } from 'next-auth/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AdminAuthProvider, FileUploadProvider } from './contexts';
import { queryClient } from './lib/queryClient';

interface AdminProvidersProps {
  children: React.ReactNode;
}

export function AdminProviders({ children }: AdminProvidersProps) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <AdminAuthProvider>
          <FileUploadProvider>{children}</FileUploadProvider>
        </AdminAuthProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
