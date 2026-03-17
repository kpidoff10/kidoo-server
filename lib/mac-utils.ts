/**
 * Utilitaires pour normaliser et comparer les adresses MAC
 *
 * Les MACs peuvent être stockées dans différents formats:
 * - Avec deux-points: 80:B5:4E:D9:61:48
 * - Avec tirets: 80-B5-4E-D9-61-48
 * - Sans séparateurs: 80B54ED96148
 *
 * Cette fonction les normalise tous en majuscules sans séparateurs
 */

/**
 * Normaliser une adresse MAC en supprimant les séparateurs et en majuscules
 * 80:B5:4E:D9:61:48 → 80B54ED96148
 */
export function normalizeMac(mac: string | null | undefined): string | null {
  if (!mac) return null;
  return mac.replace(/[:-]/g, '').toUpperCase();
}

/**
 * Comparer deux adresses MAC (peu importe le format)
 */
export function macEquals(mac1: string | null | undefined, mac2: string | null | undefined): boolean {
  if (!mac1 || !mac2) return false;
  return normalizeMac(mac1) === normalizeMac(mac2);
}

/**
 * Formater une adresse MAC en xx:xx:xx:xx:xx:xx
 */
export function formatMac(mac: string | null | undefined): string {
  if (!mac) return '';
  const normalized = normalizeMac(mac);
  if (!normalized || normalized.length !== 12) return mac;
  return normalized.match(/.{1,2}/g)?.join(':') || mac;
}

/**
 * Valider qu'une adresse MAC est au bon format (12 caractères hexadécimaux après normalisation)
 * Accepte n'importe quel format: 80B54ED96148, 80:B5:4E:D9:61:48, etc.
 */
export function isValidMac(mac: string | null | undefined): boolean {
  const normalized = normalizeMac(mac);
  if (!normalized) return false;
  return /^[0-9A-Fa-f]{12}$/.test(normalized);
}
