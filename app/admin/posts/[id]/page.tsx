'use client';

import { useRouter } from 'next/navigation';
import { useState, use } from 'react';
import Link from 'next/link';
import { AdminContent } from '@/components/ui/admin-content';
import { usePost, useUpdatePost } from '@/app/admin/hooks/usePosts';
import { PostForm, PostFormData, PostsListLoading } from '../components';

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: post, isLoading } = usePost(id);
  const updatePost = useUpdatePost(id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: PostFormData) => {
    setIsSubmitting(true);
    try {
      await updatePost.mutateAsync({
        ...data,
        excerpt: data.excerpt || null,
        imageUrl: data.imageUrl || null,
      } as any);
      router.push('/admin/posts');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour du post');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <PostsListLoading />;
  }

  if (!post) {
    return (
      <AdminContent>
        <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20">
          <p className="text-sm font-medium text-destructive">Post introuvable</p>
        </div>
      </AdminContent>
    );
  }

  return (
    <AdminContent>
      <div className="space-y-6">
        <div>
          <Link href="/admin/posts" className="text-sm text-blue-600 hover:text-blue-900 mb-2 inline-block">
            ← Retour aux actualités
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Éditer le post</h1>
          <p className="mt-1 text-muted-foreground">{post.title}</p>
        </div>

        <div className="bg-background rounded-lg border p-6">
          <PostForm initialData={post} onSubmit={handleSubmit} isLoading={isSubmitting} />
        </div>
      </div>
    </AdminContent>
  );
}
