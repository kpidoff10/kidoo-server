import type { ErrorDefinition } from '@/lib/api-response';

export const CharacterErrors = {
  VALIDATION_ERROR: {
    code: 'CHARACTER_VALIDATION_ERROR',
    status: 400,
    message: 'Données invalides',
  } satisfies ErrorDefinition,
  NOT_FOUND: {
    code: 'CHARACTER_NOT_FOUND',
    status: 404,
    message: 'Personnage non trouvé',
  } satisfies ErrorDefinition,
  INTERNAL_ERROR: {
    code: 'CHARACTER_INTERNAL_ERROR',
    status: 500,
    message: 'Erreur interne',
  } satisfies ErrorDefinition,
};
