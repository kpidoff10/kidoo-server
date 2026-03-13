'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { usePost, useUpdatePost } from '@/app/admin/hooks/usePosts';
import { PostForm, PostFormData } from '../components';

export default function EditPostPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: post, isLoading } = usePost(params.id);
  const updatePost = useUpdatePost(params.id);
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
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">Post introuvable</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <Link href="/admin/posts" className="text-blue-600 hover:text-blue-900 text-sm">
            ← Retour aux posts
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">Éditer le post</h1>
          <p className="mt-2 text-sm text-gray-600">{post.title}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <PostForm initialData={post} onSubmit={handleSubmit} isLoading={isSubmitting} />
      </div>
    </div>
  );
}
