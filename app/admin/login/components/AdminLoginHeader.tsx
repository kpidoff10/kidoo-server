import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function AdminLoginHeader() {
  return (
    <CardHeader className="space-y-1 text-center">
      <CardTitle className="text-2xl font-bold tracking-tight">
        Espace administrateur
      </CardTitle>
      <CardDescription>
        Connectez-vous avec un compte administrateur
      </CardDescription>
    </CardHeader>
  );
}
