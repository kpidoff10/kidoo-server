/**
 * Erreurs spécifiques aux routes /api/kidoos/[id]
 */

import { ErrorDefinition } from '@/lib/api-response';

/**
 * Codes d'erreur pour les routes kidoo individuel
 */
export const KidooErrors = {
  // Ressource non trouvée
  NOT_FOUND: {
    code: 'KIDOO_NOT_FOUND',
    status: 404,
    message: 'Kidoo non trouvé',
  },
  
  // Autorisation
  NOT_OWNED: {
    code: 'KIDOO_NOT_OWNED',
    status: 403,
    message: 'Vous n\'êtes pas autorisé à accéder à ce Kidoo',
  },
  
  // Validation
  VALIDATION_ERROR: {
    code: 'KIDOO_VALIDATION_ERROR',
    status: 400,
    message: 'Erreur de validation des données',
  },
  
  // Serveur
  INTERNAL_ERROR: {
    code: 'KIDOO_INTERNAL_ERROR',
    status: 500,
    message: 'Une erreur est survenue lors de la gestion du Kidoo',
  },
} as const satisfies Record<string, ErrorDefinition>;
