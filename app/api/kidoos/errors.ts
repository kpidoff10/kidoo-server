/**
 * Erreurs spécifiques aux routes /api/kidoos
 */

import { ErrorDefinition } from '@/lib/api-response';

/**
 * Codes d'erreur pour les routes kidoos
 */
export const KidoosErrors = {
  // Validation
  VALIDATION_ERROR: {
    code: 'KIDOOS_VALIDATION_ERROR',
    status: 400,
    message: 'Erreur de validation des données',
  },
  
  // Conflits
  ALREADY_REGISTERED: {
    code: 'KIDOOS_ALREADY_REGISTERED',
    status: 409,
    message: 'Ce Kidoo est déjà enregistré',
  },
  
  // Serveur
  INTERNAL_ERROR: {
    code: 'KIDOOS_INTERNAL_ERROR',
    status: 500,
    message: 'Une erreur est survenue lors de la gestion des Kidoos',
  },
} as const satisfies Record<string, ErrorDefinition>;
