'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { postFormSchema, PostFormData } from './postFormSchema';
import { Post } from '@/app/admin/lib/postsApi';
import { RichTextEditor } from './RichTextEditor';
import { ImageUpload } from './ImageUpload';

interface PostFormProps {
  initialData?: Post;
  onSubmit: (data: PostFormData) => Promise<void>;
  isLoading?: boolean;
}

export function PostForm({ initialData, onSubmit, isLoading }: PostFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<PostFormData>({
    resolver: zodResolver(postFormSchema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          excerpt: initialData.excerpt || '',
          content: initialData.content,
          imageUrl: initialData.imageUrl || '',
          type: initialData.type,
          published: initialData.published,
        }
      : {
          type: 'news',
          published: false,
        },
  });

  const published = watch('published');
  const [uploadError, setUploadError] = useState<string | null>(null);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Type</label>
        <select
          {...register('type')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="news">Actualité</option>
          <option value="update">Mise à jour</option>
          <option value="promo">Promotion</option>
          <option value="feature">Nouveauté</option>
        </select>
        {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Titre</label>
        <input
          type="text"
          {...register('title')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          placeholder="Titre de l'actualité"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
      </div>

      {/* Excerpt */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Résumé (optionnel)</label>
        <textarea
          {...register('excerpt')}
          rows={2}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          placeholder="Courte description visible sur les cards"
        />
        {errors.excerpt && <p className="mt-1 text-sm text-red-600">{errors.excerpt.message}</p>}
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Image (optionnel)</label>
        <Controller
          name="imageUrl"
          control={control}
          render={({ field }) => (
            <ImageUpload
              value={field.value || null}
              onChange={field.onChange}
              onError={setUploadError}
            />
          )}
        />
        {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
        {errors.imageUrl && <p className="mt-1 text-sm text-red-600">{errors.imageUrl.message}</p>}
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Contenu</label>
        <Controller
          name="content"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              value={field.value}
              onChange={field.onChange}
              placeholder="Écrivez votre contenu ici..."
            />
          )}
        />
        {errors.content && <p className="mt-2 text-sm text-red-600">{errors.content.message}</p>}
      </div>

      {/* Published */}
      <div className="flex items-center">
        <input
          type="checkbox"
          {...register('published')}
          id="published"
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="published" className="ml-2 block text-sm text-gray-900">
          Publier maintenant
        </label>
        {published && (
          <span className="ml-4 inline-flex items-center rounded-full bg-green-100 px-3 py-0.5 text-sm font-medium text-green-800">
            ✓ Visible
          </span>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isLoading ? 'Enregistrement...' : initialData ? 'Mettre à jour' : 'Créer'}
      </button>
    </form>
  );
}
