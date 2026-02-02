'use client';

/**
 * Page de connexion admin – NextAuth + modules (Header, Form, Card) + thème shadcn
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts';
import { AdminLoginCard } from './components';
import type { LoginInput } from '@kidoo/shared';

export default function AdminLoginPage() {
  const router = useRouter();
  const { signIn, isAuthenticated, isAdmin, isLoading } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && isAdmin) {
      const t = setTimeout(() => router.replace('/admin'), 0);
      return () => clearTimeout(t);
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  if (isLoading || (isAuthenticated && isAdmin)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary"
          aria-hidden
        />
      </div>
    );
  }

  const handleSubmit = async (data: LoginInput) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await signIn(data.email, data.password, '/admin');
      if (result.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        setSubmitError(
          result.error === 'CredentialsSignin'
            ? 'Email ou mot de passe incorrect.'
            : result.error ?? 'Une erreur est survenue.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <AdminLoginCard
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitError={submitError}
        />
      </div>
    </div>
  );
}
