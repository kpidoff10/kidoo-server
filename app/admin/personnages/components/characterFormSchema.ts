/**
 * Schema formulaire personnage (react-hook-form + zod).
 * Défini ici pour utiliser la même instance Zod que @hookform/resolvers/zod (kidoo-server).
 * Même structure que createCharacterSchema (shared), avec name '' → null pour le formulaire.
 */

import { z } from 'zod';
import { CharacterSex, CharacterPersonality } from '@kidoo/shared/prisma';

export const characterFormSchema = z.object({
  name: z
    .union([z.string().min(1).max(200), z.literal('')])
    .optional()
    .nullable()
    .transform((v) => (v === '' || v === undefined ? null : v)),
  defaultImageUrl: z.string().url().optional().nullable().or(z.literal('')),
  sex: z.nativeEnum(CharacterSex),
  personality: z.nativeEnum(CharacterPersonality),
});

export type CharacterFormValues = z.infer<typeof characterFormSchema>;
