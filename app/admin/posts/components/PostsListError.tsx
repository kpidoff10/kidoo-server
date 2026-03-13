export interface PostsListErrorProps {
  message: string;
}

export function PostsListError({ message }: PostsListErrorProps) {
  return <p className="text-destructive">Erreur lors du chargement : {message}</p>;
}
