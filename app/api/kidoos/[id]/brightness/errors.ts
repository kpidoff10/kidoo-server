/**
 * Erreurs spécifiques aux routes /api/kidoos/[id]/brightness
 */

import { ErrorDefinition } from '@/lib/api-response';

/**
 * Codes d'erreur pour les routes brightness
 */
export const BrightnessErrors = {
  // Validation
  VALIDATION_ERROR: {
    code: 'BRIGHTNESS_VALIDATION_ERROR',
    status: 400,
    message: 'La luminosité doit être un nombre entre 10 et 100',
  },
  
  // Kidoo
  KIDOO_NOT_FOUND: {
    code: 'KIDOO_NOT_FOUND',
    status: 404,
    message: 'Kidoo non trouvé',
  },
  
  NOT_OWNED: {
    code: 'KIDOO_NOT_OWNED',
    status: 403,
    message: 'Accès non autorisé',
  },
  
  NOT_CONFIGURED: {
    code: 'KIDOO_NOT_CONFIGURED',
    status: 400,
    message: 'Kidoo non configuré (adresse MAC manquante)',
  },
  
  // Services
  PUBNUB_NOT_CONFIGURED: {
    code: 'PUBNUB_NOT_CONFIGURED',
    status: 503,
    message: 'PubNub non configuré sur le serveur',
  },
  
  COMMAND_FAILED: {
    code: 'BRIGHTNESS_COMMAND_FAILED',
    status: 502,
    message: 'Échec de l\'envoi de la commande au Kidoo',
  },
  
  // Serveur
  INTERNAL_ERROR: {
    code: 'BRIGHTNESS_INTERNAL_ERROR',
    status: 500,
    message: 'Une erreur est survenue',
  },
} as const satisfies Record<string, ErrorDefinition>;
