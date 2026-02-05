import { CharacterSex, CharacterPersonality } from '@kidoo/shared/prisma';

export const SEX_LABELS: Record<string, string> = {
  FEMALE: 'Fille',
  MALE: 'Garçon',
};

export const PERSONALITY_LABELS: Record<string, string> = {
  TIMID: 'Timide',
  GRUMPY: 'Grognon',
  FUNNY: 'Rigolo',
  ALWAYS_HUNGRY: 'Toujours faim',
  BASIC: 'Basique',
};

export const SEX_OPTIONS: { value: string; label: string }[] = [
  { value: CharacterSex.FEMALE, label: 'Fille' },
  { value: CharacterSex.MALE, label: 'Garçon' },
];

export const PERSONALITY_OPTIONS: { value: string; label: string }[] = [
  { value: CharacterPersonality.TIMID, label: 'Timide' },
  { value: CharacterPersonality.GRUMPY, label: 'Grognon' },
  { value: CharacterPersonality.FUNNY, label: 'Rigolo' },
  { value: CharacterPersonality.ALWAYS_HUNGRY, label: 'Toujours faim' },
  { value: CharacterPersonality.BASIC, label: 'Basique' },
];
