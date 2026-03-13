'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { AdminContent } from '@/components/ui/admin-content';
import { PostForm, PostFormData } from '../components';
import { useCreatePost } from '@/app/admin/hooks/usePosts';

export default function NewPostPage() {
  const router = useRouter();
  const createPost = useCreatePost();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: PostFormData) => {
    setIsLoading(true);
    try {
      await createPost.mutateAsync({
        ...data,
        excerpt: data.excerpt || null,
        imageUrl: data.imageUrl || null,
      } as any);
      router.push('/admin/posts');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création du post');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminContent>
      <div className="space-y-6">
        <div>
          <Link href="/admin/posts" className="text-sm text-blue-600 hover:text-blue-900 mb-2 inline-block">
            ← Retour aux actualités
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Nouveau post</h1>
          <p className="mt-1 text-muted-foreground">Créez une nouvelle actualité</p>
        </div>

        <div className="bg-background rounded-lg border p-6">
          <PostForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </div>
    </AdminContent>
  );
}
