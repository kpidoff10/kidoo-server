'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Nouveau post</h1>
        <p className="mt-2 text-sm text-gray-600">Créez une nouvelle actualité</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <PostForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
}
