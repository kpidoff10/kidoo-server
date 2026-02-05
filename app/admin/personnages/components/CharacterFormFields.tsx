'use client';

import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SEX_OPTIONS, PERSONALITY_OPTIONS } from './constants';
import type { CharacterFormValues } from './CharacterForm';

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export interface CharacterFormFieldsProps {
  register: UseFormRegister<CharacterFormValues>;
  errors: FieldErrors<CharacterFormValues>;
}

export function CharacterFormFields({ register, errors }: CharacterFormFieldsProps) {
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
    </>
  );
}
