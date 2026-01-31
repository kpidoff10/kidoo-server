/**
 * Erreurs spécifiques aux routes /api/auth/mobile
 */

import { ErrorDefinition } from '@/lib/api-response';

/**
 * Codes d'erreur pour les routes auth mobile
 */
export const AuthMobileErrors = {
  // Validation
  VALIDATION_ERROR: {
    code: 'AUTH_MOBILE_VALIDATION_ERROR',
    status: 400,
    message: 'Erreur de validation des données',
  },
  
  // Authentification
  INVALID_CREDENTIALS: {
    code: 'AUTH_MOBILE_INVALID_CREDENTIALS',
    status: 401,
    message: 'Email ou mot de passe incorrect',
  },
  
  PASSWORD_INCORRECT: {
    code: 'AUTH_MOBILE_PASSWORD_INCORRECT',
    status: 400,
    message: 'Mot de passe actuel incorrect',
  },
  
  // Serveur
  INTERNAL_ERROR: {
    code: 'AUTH_MOBILE_INTERNAL_ERROR',
    status: 500,
    message: 'Une erreur est survenue lors de l\'authentification',
  },
} as const satisfies Record<string, ErrorDefinition>;
