/**
 * GET /api/devices/[mac]/timezone
 * Route pour que l'ESP32 récupère le fuseau horaire de l'utilisateur via son adresse MAC.
 *
 * Protégé par signature Ed25519 si le Kidoo a une publicKey.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';
import { withDeviceAuth } from '@/lib/withDeviceAuth';

function normalizeMacAddress(mac: string): string {
  return mac.replace(/[:.\-]/g, '').toUpperCase();
}

export const GET = withDeviceAuth(async (request, { params }) => {
  try {
    const { mac } = await params;

    if (!mac) {
      return createErrorResponse('BAD_REQUEST', 400, {
        message: 'Adresse MAC manquante',
      });
    }

    const normalizedMac = normalizeMacAddress(mac);

    const allKidoos = await prisma.kidoo.findMany({
      where: { macAddress: { not: null } },
      include: {
        user: true,
      },
    });

    const kidoo = allKidoos.find((k) => {
      if (!k.macAddress) return false;
      return normalizeMacAddress(k.macAddress) === normalizedMac;
    });

    if (!kidoo) {
      return createErrorResponse('NOT_FOUND', 404, {
        message: 'Kidoo non trouvé pour cette adresse MAC',
      });
    }

    if (!kidoo.user) {
      return createErrorResponse('NOT_FOUND', 404, {
        message: 'Propriétaire du Kidoo non trouvé',
      });
    }

    const timezoneId = kidoo.user.timezoneId || 'UTC';

    return NextResponse.json({
      success: true,
      timezoneId,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du fuseau horaire:', error);
    return createErrorResponse('INTERNAL_SERVER_ERROR', 500, {
      message: 'Une erreur est survenue lors de la récupération du fuseau horaire',
    });
  }
});
