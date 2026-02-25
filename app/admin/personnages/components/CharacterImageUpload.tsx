'use client';

import { useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { charactersApi } from '../../lib/charactersApi';

export interface CharacterImageUploadProps {
  characterId: string;
  currentUrl: string;
  onUrlChange: (url: string) => void;
  onUploadComplete?: (url: string) => void;
  disabled?: boolean;
}

const ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,image/gif';

export function CharacterImageUpload({
  characterId,
  currentUrl,
  onUrlChange,
  onUploadComplete,
  disabled = false,
}: CharacterImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !characterId) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Format accepté : JPG, PNG, WebP, GIF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 10 Mo)');
      return;
    }

    setError(null);
    setIsUploading(true);
    setProgress(0);
    try {
      setProgress(20);
      const result = await charactersApi.uploadImage(characterId, file);
      setProgress(100);
      if (result.success) {
        onUrlChange(result.publicUrl);
        onUploadComplete?.(result.publicUrl);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Label>Image par défaut</Label>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="aspect-square w-32 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
          {currentUrl ? (
            <Image
              src={currentUrl}
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
            accept={ACCEPT}
            onChange={handleFileChange}
            disabled={disabled || isUploading}
            className="hidden"
            id="character-image-upload"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
          >
            Choisir une image
          </Button>
          {(isUploading) && (
            <div className="mt-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Envoi vers Cloudflare R2… {progress}%
              </p>
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WebP ou GIF. Max 10 Mo.
          </p>
        </div>
      </div>
    </div>
  );
}
