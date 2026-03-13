'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { postFormSchema, PostFormData } from './postFormSchema';
import { Post } from '@/app/admin/lib/postsApi';
import { RichTextEditor } from './RichTextEditor';
import { ImageUpload } from './ImageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface PostFormProps {
  initialData?: Post;
  onSubmit: (data: PostFormData) => Promise<void>;
  isLoading?: boolean;
}

const TYPE_LABELS = {
  news: 'Actualité',
  update: 'Mise à jour',
  promo: 'Promotion',
  feature: 'Nouveauté',
};

export function PostForm({ initialData, onSubmit, isLoading }: PostFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
    setValue,
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
  const typeValue = watch('type');
  const [uploadError, setUploadError] = useState<string | null>(null);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Type */}
      <div className="space-y-3">
        <Label htmlFor="type">Type</Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
      </div>

      {/* Title */}
      <div className="space-y-3">
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          {...register('title')}
          placeholder="Titre de l'actualité"
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      {/* Excerpt */}
      <div className="space-y-3">
        <Label htmlFor="excerpt">Résumé (optionnel)</Label>
        <Textarea
          id="excerpt"
          {...register('excerpt')}
          placeholder="Courte description visible sur les cards"
          className="resize-none"
        />
        {errors.excerpt && <p className="text-sm text-destructive">{errors.excerpt.message}</p>}
      </div>

      {/* Image Upload */}
      <div className="space-y-3">
        <Label>Image (optionnel)</Label>
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
        {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
        {errors.imageUrl && <p className="text-sm text-destructive">{errors.imageUrl.message}</p>}
      </div>

      {/* Content */}
      <div className="space-y-3">
        <Label>Contenu</Label>
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
        {errors.content && <p className="text-sm text-destructive">{errors.content.message}</p>}
      </div>

      {/* Published */}
      <div className="flex items-center space-x-3 rounded-lg border border-input p-4 bg-muted/30">
        <Controller
          name="published"
          control={control}
          render={({ field }) => (
            <Checkbox
              id="published"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <div className="flex-1">
          <Label htmlFor="published" className="font-semibold cursor-pointer">
            Publier maintenant
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {published ? 'Cet article sera visible à tous' : 'Cet article restera en brouillon'}
          </p>
        </div>
        {published && (
          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            ✓ Visible
          </span>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isLoading}
          size="lg"
          className="flex-1"
        >
          {isLoading ? 'Enregistrement...' : initialData ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
}
