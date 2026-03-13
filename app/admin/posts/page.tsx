'use client';

import Link from 'next/link';
import { usePosts, useDeletePost } from '@/app/admin/hooks/usePosts';
import { AdminContent } from '@/components/ui/admin-content';
import { Button } from '@/components/ui/button';
import { Post } from '@/app/admin/lib/postsApi';
import { PostCard, PostsListLoading, PostsListError, PostsListEmpty } from './components';

export default function PostsPage() {
  const { data: posts, isLoading, error } = usePosts();
  const deletePost = useDeletePost();

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce post ?')) {
      try {
        await deletePost.mutateAsync(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (isLoading) {
    return <PostsListLoading />;
  }

  if (error) {
    return <PostsListError message={error.message} />;
  }

  return (
    <AdminContent>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Actualités</h1>
          <p className="mt-1 text-muted-foreground">
            Gérez les news et actualités de l'application.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/posts/new">Nouveau post</Link>
        </Button>
      </div>

      {!posts?.length ? (
        <PostsListEmpty />
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </AdminContent>
  );
}
