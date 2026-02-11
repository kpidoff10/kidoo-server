import type { TriggerType } from './charactersApi';

/** Libellé pour "n'importe lequel" (quand on ne choisit pas un aliment précis). */
export const VARIANT_ANY_LABEL = "N'importe lequel";

/** Libellés des variants par catégorie de trigger (affichage uniquement). */
const HUNGER_VARIANT_LABELS: Record<number, string> = {
  0: VARIANT_ANY_LABEL,
  1: 'Biberon',
  2: 'Gâteau',
  3: 'Pomme',
  4: 'Bonbon',
};

/** Triggers de la catégorie "Manger" (faim + manger, mêmes variants : Biberon, Gâteau, Pomme, Bonbon). */
const MANGER_TRIGGERS: TriggerType[] = [
  'hunger_critical',
  'hunger_low',
  'hunger_medium',
  'eating',
];

function isMangerTrigger(trigger: TriggerType): boolean {
  return MANGER_TRIGGERS.includes(trigger);
}

/**
 * Retourne le libellé d’affichage d’un variant selon le trigger.
 * Ex. (eating, 1) → "Biberon", (hunger_low, 2) → "Gâteau".
 */
export function getVariantLabel(trigger: TriggerType | null | undefined, variant: number): string {
  const t = trigger ?? 'manual';
  const v = variant === 0 ? 0 : Math.max(1, Math.min(4, Math.floor(variant) || 1));

  if (isMangerTrigger(t) && HUNGER_VARIANT_LABELS[v] !== undefined) {
    return HUNGER_VARIANT_LABELS[v];
  }

  if (v === 0) return VARIANT_ANY_LABEL;
  return `Variante ${v}`;
}

/**
 * Retourne la liste des options { value, label } pour le sélecteur de variant
 * selon le trigger (libellés spécifiques à la catégorie ou génériques).
 */
export function getVariantOptions(trigger: TriggerType | null | undefined): Array<{ value: number; label: string }> {
  const t = trigger ?? 'manual';
  const useManger = isMangerTrigger(t);

  const values = useManger ? [0, 1, 2, 3, 4] : [1, 2, 3, 4];
  return values.map((value) => ({
    value,
    label: useManger && HUNGER_VARIANT_LABELS[value] !== undefined
      ? HUNGER_VARIANT_LABELS[value]
      : value === 0
        ? VARIANT_ANY_LABEL
        : `Variante ${value}`,
  }));
}
