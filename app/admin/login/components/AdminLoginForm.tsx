'use client';

/**
 * Formulaire de connexion admin – react-hook-form + Zod (shared) + composants UI
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@kidoo/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface AdminLoginFormProps {
  onSubmit: (data: LoginInput) => Promise<void>;
  isSubmitting?: boolean;
  submitError?: string | null;
  className?: string;
}

export function AdminLoginForm({
  onSubmit,
  isSubmitting = false,
  submitError = null,
  className,
}: AdminLoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- contournement Zod v4 + zodResolver (type instantiation excessively deep)
    resolver: zodResolver(loginSchema as any),
    defaultValues: { email: '', password: '' },
  });

  return (
    <CardContent className={cn('pt-0', className)}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="admin-login-email">Email</Label>
          <Input
            id="admin-login-email"
            type="email"
            autoComplete="email"
            placeholder="admin@example.com"
            aria-invalid={!!errors.email}
            className={errors.email ? 'border-destructive' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-destructive" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-login-password">Mot de passe</Label>
          <Input
            id="admin-login-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            className={errors.password ? 'border-destructive' : undefined}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-destructive" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        {submitError && (
          <Alert variant="destructive" className="py-3">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
    </CardContent>
  );
}
