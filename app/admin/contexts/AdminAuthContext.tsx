'use client';

/**
 * Admin Auth Context
 * Gestion de l'authentification admin via NextAuth (session)
 * Pattern aligné avec l'app mobile : Provider + useAuth
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
} from 'react';
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import type { Session } from 'next-auth';

export interface AdminUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  isAdmin: boolean;
}

interface AdminAuthState {
  user: AdminUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

interface AdminAuthContextType extends AdminAuthState {
  signIn: (email: string, password: string, callbackUrl?: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: (callbackUrl?: string) => Promise<void>;
  refresh: () => Promise<Session | null>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

function sessionToUser(session: Session | null): AdminUser | null {
  if (!session?.user) return null;
  const u = session.user;
  return {
    id: u.id ?? '',
    email: u.email ?? '',
    name: u.name ?? null,
    image: u.image ?? null,
    isAdmin: (u as { isAdmin?: boolean }).isAdmin ?? false,
  };
}

interface AdminAuthProviderProps {
  children: React.ReactNode;
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const { data: session, status, update } = useSession();

  const user = useMemo(() => sessionToUser(session ?? null), [session]);
  const isAuthenticated = status === 'authenticated';
  const isAdmin = (user?.isAdmin) ?? false;
  const isLoading = status === 'loading';

  const signIn = useCallback(
    async (
      email: string,
      password: string,
      callbackUrl = '/admin'
    ): Promise<{ ok: boolean; error?: string }> => {
      const result = await nextAuthSignIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        return { ok: false, error: result.error };
      }
      if (result?.ok) {
        return { ok: true };
      }
      return { ok: false, error: 'Une erreur est survenue' };
    },
    []
  );

  const signOut = useCallback(async (callbackUrl = '/admin/login') => {
    await nextAuthSignOut({ callbackUrl });
  }, []);

  const refresh = useCallback(async () => {
    const s = await update();
    return s ?? null;
  }, [update]);

  const value = useMemo<AdminAuthContextType>(
    () => ({
      user,
      session: session ?? null,
      isLoading,
      isAuthenticated,
      isAdmin,
      signIn,
      signOut,
      refresh,
    }),
    [user, session, isLoading, isAuthenticated, isAdmin, signIn, signOut, refresh]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAuth(): AdminAuthContextType {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AdminAuthProvider');
  }
  return context;
}
