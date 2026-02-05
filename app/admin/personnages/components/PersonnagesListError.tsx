export interface PersonnagesListErrorProps {
  message: string;
}

export function PersonnagesListError({ message }: PersonnagesListErrorProps) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-destructive">Erreur lors du chargement : {message}</p>
    </div>
  );
}
