import type { ErrorDefinition } from '@/lib/api-response';

export const FirmwareErrors = {
  VALIDATION_ERROR: {
    code: 'FIRMWARE_VALIDATION_ERROR',
    status: 400,
    message: 'Données invalides',
  } satisfies ErrorDefinition,
  MODEL_INVALID: {
    code: 'FIRMWARE_MODEL_INVALID',
    status: 400,
    message: 'Modèle invalide',
  } satisfies ErrorDefinition,
  VERSION_EXISTS: {
    code: 'FIRMWARE_VERSION_EXISTS',
    status: 409,
    message: 'Cette version existe déjà pour ce modèle',
  } satisfies ErrorDefinition,
  NOT_FOUND: {
    code: 'FIRMWARE_NOT_FOUND',
    status: 404,
    message: 'Firmware non trouvé',
  } satisfies ErrorDefinition,
  INTERNAL_ERROR: {
    code: 'FIRMWARE_INTERNAL_ERROR',
    status: 500,
    message: 'Erreur interne',
  } satisfies ErrorDefinition,
};
