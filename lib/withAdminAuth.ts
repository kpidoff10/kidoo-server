/**
 * Wrapper pour protéger les routes API admin (session NextAuth + isAdmin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createErrorResponse } from './api-response';

export interface AdminAuthenticatedRequest extends NextRequest {
  userId: string;
  isAdmin: true;
}

export type AdminRouteHandler = (
  request: AdminAuthenticatedRequest
) => Promise<NextResponse>;

export type AdminRouteHandlerWithParams<T = unknown> = (
  request: AdminAuthenticatedRequest,
  context: T
) => Promise<NextResponse>;

export function withAdminAuth(handler: AdminRouteHandler): (request: NextRequest) => Promise<NextResponse>;
export function withAdminAuth<T>(
  handler: AdminRouteHandlerWithParams<T>
): (request: NextRequest, context: T) => Promise<NextResponse>;

export function withAdminAuth<T>(
  handler: AdminRouteHandler | AdminRouteHandlerWithParams<T>
) {
  return async (request: NextRequest, context?: T): Promise<NextResponse> => {
    const session = await auth();

    if (!session?.user) {
      return createErrorResponse('UNAUTHORIZED', 401, {
        message: 'Authentification requise',
      });
    }

    const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin;
    if (!isAdmin) {
      return createErrorResponse('FORBIDDEN', 403, {
        message: 'Accès administrateur requis',
      });
    }

    const adminRequest = request as AdminAuthenticatedRequest;
    adminRequest.userId = session.user.id!;
    adminRequest.isAdmin = true;

    if (context !== undefined) {
      return (handler as AdminRouteHandlerWithParams<T>)(adminRequest, context);
    }
    return (handler as AdminRouteHandler)(adminRequest);
  };
}
