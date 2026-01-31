/**
 * Helpers de base pour les réponses API standardisées
 * Supporte l'internationalisation avec des clés de traduction
 */

import { NextResponse } from 'next/server';

/**
 * Structure d'une réponse d'erreur API
 */
export interface ApiErrorResponse {
  success: false;
  error: string; // Message en français (pour debug/logs)
  errorCode: string; // Code d'erreur (l'app mobile fait le mapping vers les clés i18n)
  field?: string; // Champ concerné (pour erreurs de validation)
  details?: any; // Détails supplémentaires (optionnel, seulement en dev)
}

/**
 * Structure d'une réponse de succès API
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string; // Message optionnel
}

/**
 * Options pour créer une réponse d'erreur
 */
export interface CreateErrorOptions {
  message?: string;
  field?: string;
  details?: any;
  status?: number; // Override le status par défaut si nécessaire
}

/**
 * Structure d'une définition d'erreur
 */
export interface ErrorDefinition {
  code: string;
  status: number;
  message: string;
}

/**
 * Crée une réponse d'erreur standardisée
 * 
 * @param errorCode - Code d'erreur (l'app mobile fait le mapping vers les clés i18n)
 * @param defaultStatus - Status HTTP par défaut
 * @param options - Options supplémentaires
 * @returns NextResponse avec la structure d'erreur standardisée
 * 
 * @example
 * ```typescript
 * return createErrorResponse('KIDOO_NOT_FOUND', 404);
 * ```
 */
export function createErrorResponse(
  errorCode: string,
  defaultStatus: number,
  options?: CreateErrorOptions
): NextResponse<ApiErrorResponse>;

/**
 * Crée une réponse d'erreur standardisée à partir d'une définition d'erreur
 * 
 * @param errorDefinition - Définition de l'erreur (code, status, message)
 * @param options - Options supplémentaires (override message, field, details)
 * @returns NextResponse avec la structure d'erreur standardisée
 * 
 * @example
 * ```typescript
 * return createErrorResponse(KidoosErrors.VALIDATION_ERROR, { field: 'email' });
 * ```
 */
export function createErrorResponse(
  errorDefinition: ErrorDefinition,
  options?: Omit<CreateErrorOptions, 'status'>
): NextResponse<ApiErrorResponse>;

export function createErrorResponse(
  errorCodeOrDefinition: string | ErrorDefinition,
  defaultStatusOrOptions?: number | Omit<CreateErrorOptions, 'status'>,
  options?: CreateErrorOptions
): NextResponse<ApiErrorResponse> {
  // Si c'est une définition d'erreur (objet)
  if (typeof errorCodeOrDefinition === 'object') {
    const errorDef = errorCodeOrDefinition;
    const opts = defaultStatusOrOptions as Omit<CreateErrorOptions, 'status'> | undefined;
    
    const response: ApiErrorResponse = {
      success: false,
      error: opts?.message || errorDef.message,
      errorCode: errorDef.code,
      ...(opts?.field && { field: opts.field }),
      ...(opts?.details && process.env.NODE_ENV === 'development' && { details: opts.details }),
    };

    return NextResponse.json(response, { status: errorDef.status });
  }
  
  // Si c'est un code d'erreur (string) - ancienne API
  const errorCode = errorCodeOrDefinition;
  const defaultStatus = defaultStatusOrOptions as number;
  const opts = options;
  const statusCode = opts?.status || defaultStatus;
  const defaultMessage = opts?.message || errorCode;
  
  const response: ApiErrorResponse = {
    success: false,
    error: opts?.message || defaultMessage,
    errorCode,
    ...(opts?.field && { field: opts.field }),
    ...(opts?.details && process.env.NODE_ENV === 'development' && { details: opts.details }),
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Crée une réponse de succès standardisée
 * 
 * @param data - Données à retourner
 * @param options - Options supplémentaires (message, status)
 * @returns NextResponse avec la structure de succès standardisée
 * 
 * @example
 * ```typescript
 * return createSuccessResponse({ id: '123', name: 'Kidoo' });
 * return createSuccessResponse(kidoos, { message: 'Kidoos récupérés', status: 200 });
 * ```
 */
export function createSuccessResponse<T>(
  data: T,
  options?: {
    message?: string;
    status?: number;
  }
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(options?.message && { message: options.message }),
  };

  return NextResponse.json(response, { status: options?.status || 200 });
}
