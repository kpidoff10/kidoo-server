/**
 * Erreurs spécifiques aux routes /api/auth/mobile/change-password
 */

import { ErrorDefinition } from '@/lib/api-response';

/**
 * Codes d'erreur pour les routes change-password
 */
export const ChangePasswordErrors = {
  // Authentification
  TOKEN_MISSING: {
    code: 'AUTH_TOKEN_MISSING',
    status: 401,
    message: 'Token manquant',
  },
  
  TOKEN_INVALID: {
    code: 'AUTH_TOKEN_INVALID',
    status: 401,
    message: 'Token invalide ou expiré',
  },
  
  // Validation
  VALIDATION_ERROR: {
    code: 'CHANGE_PASSWORD_VALIDATION_ERROR',
    status: 400,
    message: 'Erreur de validation des données',
  },
  
  // Utilisateur
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    status: 404,
    message: 'Utilisateur non trouvé',
  },
  
  NO_PASSWORD_SET: {
    code: 'NO_PASSWORD_SET',
    status: 400,
    message: 'Aucun mot de passe configuré pour ce compte',
  },
  
  PASSWORD_INCORRECT: {
    code: 'PASSWORD_INCORRECT',
    status: 400,
    message: 'Mot de passe actuel incorrect',
  },
  
  // Serveur
  INTERNAL_ERROR: {
    code: 'CHANGE_PASSWORD_INTERNAL_ERROR',
    status: 500,
    message: 'Une erreur est survenue',
  },
} as const satisfies Record<string, ErrorDefinition>;
