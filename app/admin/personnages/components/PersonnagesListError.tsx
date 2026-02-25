import { AdminContent } from '@/components/ui/admin-content';

export interface PersonnagesListErrorProps {
  message: string;
}

export function PersonnagesListError({ message }: PersonnagesListErrorProps) {
  return (
    <AdminContent>
      <p className="text-destructive">Erreur lors du chargement : {message}</p>
    </AdminContent>
  );
}
