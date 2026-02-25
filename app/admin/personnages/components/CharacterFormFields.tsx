'use client';

import { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SEX_OPTIONS, PERSONALITY_OPTIONS } from './constants';
import type { CharacterFormValues } from './CharacterForm';

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export interface CharacterFormFieldsProps {
  register: UseFormRegister<CharacterFormValues>;
  errors: FieldErrors<CharacterFormValues>;
  setValue: UseFormSetValue<CharacterFormValues>;
  watch: UseFormWatch<CharacterFormValues>;
}

export function CharacterFormFields({ register, errors, setValue, watch }: CharacterFormFieldsProps) {
  const imageWidth = watch('imageWidth') ?? 240;
  const imageHeight = watch('imageHeight') ?? 280;

  const handleSwap = () => {
    setValue('imageWidth', imageHeight);
    setValue('imageHeight', imageWidth);
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Nom (optionnel)</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="ex. Gochi"
          maxLength={200}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="characterContext">Description pour l'IA (optionnel)</Label>
        <Textarea
          id="characterContext"
          {...register('characterContext')}
          placeholder="ex. C'est un fantôme mignon, il n'a pas de bouche ni de nez, juste de grands yeux expressifs..."
          maxLength={2000}
          rows={4}
          className="resize-none"
        />
        {errors.characterContext && (
          <p className="text-sm text-destructive">{errors.characterContext.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Ce texte aide l'IA à comprendre les spécificités du personnage lors de la génération des animations.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sex">Sexe</Label>
        <select
          id="sex"
          {...register('sex')}
          className={selectClassName}
        >
          {SEX_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.sex && (
          <p className="text-sm text-destructive">{errors.sex.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="personality">Personnalité / Contexte</Label>
        <select
          id="personality"
          {...register('personality')}
          className={selectClassName}
        >
          {PERSONALITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.personality && (
          <p className="text-sm text-destructive">{errors.personality.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Résolution (largeur × hauteur)</Label>
        <div className="flex items-center gap-2">
          <Input
            id="imageWidth"
            type="number"
            min={1}
            max={4096}
            {...register('imageWidth', { valueAsNumber: true })}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">×</span>
          <Input
            id="imageHeight"
            type="number"
            min={1}
            max={4096}
            {...register('imageHeight', { valueAsNumber: true })}
            className="w-24"
          />
          <span className="text-xs text-muted-foreground">px</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSwap}
            title="Pivoter (swap largeur / hauteur)"
          >
            ↔
          </Button>
        </div>
        {errors.imageWidth && (
          <p className="text-sm text-destructive">{errors.imageWidth.message}</p>
        )}
        {errors.imageHeight && (
          <p className="text-sm text-destructive">{errors.imageHeight.message}</p>
        )}
      </div>
    </>
  );
}
