'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { characterFormSchema, type CharacterFormValues } from './characterFormSchema';
import { CharacterFormFields } from './CharacterFormFields';
import { CharacterImageUpload } from './CharacterImageUpload';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export type { CharacterFormValues };

export interface CharacterFormProps {
  /** Mode création ou édition */
  mode: 'create' | 'edit';
  /** Valeurs initiales (obligatoire en edit, ignoré en create) */
  defaultValues?: CharacterFormValues;
  /** Soumission avec données validées par zod */
  onSubmit: (data: CharacterFormValues) => void | Promise<void>;
  /** Erreur serveur / réseau à afficher */
  error?: string | null;
  /** En edit : id du personnage pour l’upload d’image */
  characterId?: string | null;
  /** En edit : appelé après upload réussi (ex. invalidation) */
  onImageUploaded?: (url: string) => void;
  /** En create : fichier sélectionné, envoyé après création */
  pendingFile?: File | null;
  onPendingFileChange?: (file: File | null) => void;
  children: React.ReactNode;
}

export function CharacterForm({
  mode,
  defaultValues: defaultValuesProp,
  onSubmit,
  error,
  characterId,
  onImageUploaded,
  pendingFile,
  onPendingFileChange,
  children,
}: CharacterFormProps) {
  const defaultValues: CharacterFormValues =
    mode === 'edit' && defaultValuesProp
      ? defaultValuesProp
      : {
          name: null,
          defaultImageUrl: null,
          sex: 'FEMALE',
          personality: 'BASIC',
        };

  const form = useForm<CharacterFormValues>({
    resolver: zodResolver(characterFormSchema),
    defaultValues: {
      name: defaultValues.name ?? '',
      defaultImageUrl: defaultValues.defaultImageUrl ?? '',
      sex: defaultValues.sex,
      personality: defaultValues.personality,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = form;

  const defaultImageUrl = watch('defaultImageUrl') ?? '';

  const handleFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data);
  });

  const handleUploadComplete = (url: string) => {
    setValue('defaultImageUrl', url);
    onImageUploaded?.(url);
  };

  const formContent = (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <CharacterFormFields register={register} errors={errors} />

      {characterId ? (
        <CharacterImageUpload
          characterId={characterId}
          currentUrl={defaultImageUrl}
          onUrlChange={(url) => setValue('defaultImageUrl', url)}
          onUploadComplete={handleUploadComplete}
        />
      ) : onPendingFileChange ? (
        <PendingFileInput
          pendingFile={pendingFile ?? null}
          onPendingFileChange={onPendingFileChange}
        />
      ) : null}

      <div className="flex flex-wrap gap-3 pt-2">
        {children}
      </div>
    </form>
  );

  return formContent;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function PendingFileInput({
  pendingFile,
  onPendingFileChange,
}: {
  pendingFile: File | null;
  onPendingFileChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    const file = e.target.files?.[0] ?? null;
    if (file) {
      const valid = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
      if (!valid) return;
      if (file.size > 10 * 1024 * 1024) return;
      setPreviewUrl(URL.createObjectURL(file));
    }
    onPendingFileChange(file || null);
  };

  return (
    <div className="space-y-2">
      <Label>Image par défaut</Label>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="aspect-square w-32 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Aperçu"
              width={128}
              height={128}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl text-muted-foreground">
              ?
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            onChange={handleChange}
            className="hidden"
            id="character-pending-image"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            Choisir une image
          </Button>
          {pendingFile && (
            <p className="mt-1 text-sm text-muted-foreground">
              {pendingFile.name} · {formatBytes(pendingFile.size)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WebP ou GIF. Max 10 Mo. Envoyé sur Cloudflare après création.
          </p>
        </div>
      </div>
    </div>
  );
}
