/**
 * Middleware/Wrapper pour l'authentification des routes API
 * Simplifie l'utilisation de requireAuth dans les route handlers
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from './auth-helpers';

/**
 * Request enrichie avec userId après authentification
 */
export interface AuthenticatedRequest extends NextRequest {
  userId: string;
}

/**
 * Handler de route authentifié sans params
 */
export type AuthenticatedRouteHandler = (
  request: AuthenticatedRequest
) => Promise<NextResponse>;

/**
 * Handler de route authentifié avec params
 */
export type AuthenticatedRouteHandlerWithParams<T = any> = (
  request: AuthenticatedRequest,
  context: T
) => Promise<NextResponse>;

/**
 * Wrapper pour protéger une route avec authentification (sans params)
 * 
 * @param handler - Le handler de route qui recevra une request avec userId
 * @returns Un handler qui vérifie l'authentification avant d'appeler le handler original
 * 
 * @example
 * ```typescript
 * export const GET = withAuth(async (request) => {
 *   const { userId } = request; // userId est déjà disponible
 *   // ... votre logique
 * });
 * ```
 */
export function withAuth(
  handler: AuthenticatedRouteHandler
): (request: NextRequest) => Promise<NextResponse>;

/**
 * Wrapper pour protéger une route avec authentification (avec params)
 * 
 * @param handler - Le handler de route qui recevra une request avec userId et params
 * @returns Un handler qui vérifie l'authentification avant d'appeler le handler original
 * 
 * @example
 * ```typescript
 * export const GET = withAuth(async (request, { params }) => {
 *   const { userId } = request; // userId est déjà disponible
 *   const { id } = await params;
 *   // ... votre logique
 * });
 * ```
 */
export function withAuth<T>(
  handler: AuthenticatedRouteHandlerWithParams<T>
): (request: NextRequest, context: T) => Promise<NextResponse>;

export function withAuth<T>(
  handler: AuthenticatedRouteHandler | AuthenticatedRouteHandlerWithParams<T>
) {
  return async (request: NextRequest, context?: T): Promise<NextResponse> => {
    // Vérifier l'authentification
    const authResult = requireAuth(request);
    
    if (!authResult.success) {
      return authResult.response;
    }

    // Enrichir la request avec userId
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.userId = authResult.userId;

    // Appeler le handler original avec la request enrichie
    if (context !== undefined) {
      return (handler as AuthenticatedRouteHandlerWithParams<T>)(authenticatedRequest, context);
    } else {
      return (handler as AuthenticatedRouteHandler)(authenticatedRequest);
    }
  };
}
