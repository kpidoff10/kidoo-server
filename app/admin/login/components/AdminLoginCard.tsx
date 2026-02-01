import Link from 'next/link';
import { Card, CardFooter } from '@/components/ui/card';
import { AdminLoginHeader } from './AdminLoginHeader';
import { AdminLoginForm } from './AdminLoginForm';
import type { LoginInput } from '@kidoo/shared';
import { cn } from '@/lib/utils';

export interface AdminLoginCardProps {
  onSubmit: (data: LoginInput) => Promise<void>;
  isSubmitting?: boolean;
  submitError?: string | null;
  className?: string;
}

export function AdminLoginCard({
  onSubmit,
  isSubmitting = false,
  submitError = null,
  className,
}: AdminLoginCardProps) {
  return (
    <Card className={cn('w-full max-w-md border-border shadow-lg', className)}>
      <AdminLoginHeader />
      <AdminLoginForm
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        submitError={submitError}
      />
      <CardFooter className="flex justify-center border-t border-border pt-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground"
        >
          Retour à l&apos;accueil
        </Link>
      </CardFooter>
    </Card>
  );
}
