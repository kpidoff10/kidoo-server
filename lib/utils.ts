import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utilitaire pour fusionner les classes Tailwind (pattern shadcn/ui)
 * @see https://ui.shadcn.com/docs
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
