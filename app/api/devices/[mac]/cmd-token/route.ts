/**
 * Route API pour obtenir un token de commande MQTT signé
 * POST /api/devices/{mac}/cmd-token
 *
 * Endpoint accessible par l'app pour obtenir un JWT signé pour une commande
 * Requête authentifiée via NextAuth (Bearer token)
 * Retourne un token JWT HMAC-SHA256 valide 2 min
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { generateCmdToken } from '@/lib/cmd-jwt';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

/**
 * Handler pour générer un token de commande
 * Vérifie que l'utilisateur possède le device
 */
async function handler(
  request: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const { mac } = await params;
    const { userId } = request;

    if (!userId) {
      return createErrorResponse('UNAUTHORIZED', 401, {
        message: 'Utilisateur non authentifié',
      });
    }

    // Parser le body pour obtenir l'action
    let action = 'unknown';
    try {
      const body = await request.json();
      action = body.action || 'unknown';
    } catch {
      return createErrorResponse('BAD_REQUEST', 400, {
        message: 'Body JSON invalide',
      });
    }

    // Vérifier que l'utilisateur possède ce device
    // Chercher en ignorant les séparateurs (: - etc.)
    const normalizedMac = mac.replace(/[:-]/g, '').toUpperCase();
    const kidoos = await prisma.kidoo.findMany({
      where: {
        userId: userId,
      },
    });
    const kidoo = kidoos.find((k) => {
      if (!k.macAddress) return false;
      const kMac = k.macAddress.replace(/[:-]/g, '').toUpperCase();
      return kMac === normalizedMac;
    });

    if (!kidoo) {
      console.warn(`[CMD-TOKEN] Device ${normalizedMac} non trouvé ou n'appartient pas à l'utilisateur ${userId}`);
      return createErrorResponse('FORBIDDEN', 403, {
        message: 'Device non trouvé ou vous n\'en êtes pas propriétaire',
      });
    }

    // Générer le token JWT signé
    const cmdToken = generateCmdToken({
      kidooMac: normalizedMac,
      userId,
      action,
    });

    console.log(`[CMD-TOKEN] Token généré pour device: ${normalizedMac}, action: ${action}, user: ${userId}`);

    return createSuccessResponse({
      cmdToken,
      expiresIn: 120, // 2 minutes
    });
  } catch (error) {
    console.error('[CMD-TOKEN] Erreur:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
}

export const POST = withAuth(handler);
