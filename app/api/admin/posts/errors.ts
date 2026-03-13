import { ErrorDefinition } from '@/lib/api-response';

export const PostErrors = {
  NOT_FOUND: {
    code: 'POST_NOT_FOUND',
    status: 404,
    message: 'Post introuvable',
  } as ErrorDefinition,
  VALIDATION_ERROR: {
    code: 'POST_VALIDATION_ERROR',
    status: 400,
    message: 'Données invalides',
  } as ErrorDefinition,
  INTERNAL_ERROR: {
    code: 'POST_INTERNAL_ERROR',
    status: 500,
    message: 'Erreur interne',
  } as ErrorDefinition,
} as const;
