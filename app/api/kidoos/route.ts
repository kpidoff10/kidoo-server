/**
 * Routes API pour les Kidoos
 * GET /api/kidoos - Récupérer tous les kidoos de l'utilisateur connecté
 * POST /api/kidoos - Créer un nouveau kidoo
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createKidooInputSchema } from '@/shared';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { KidoosErrors } from './errors';

/**
 * GET /api/kidoos
 * Récupère tous les kidoos de l'utilisateur connecté
 */
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { userId } = request;

    // Récupérer les kidoos de l'utilisateur
    const kidoos = await prisma.kidoo.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convertir les dates en ISO strings pour la compatibilité JSON
    const kidoosWithISOStrings = kidoos.map((kidoo) => ({
      ...kidoo,
      lastConnected: kidoo.lastConnected?.toISOString() || null,
      createdAt: kidoo.createdAt.toISOString(),
      updatedAt: kidoo.updatedAt.toISOString(),
    }));

    return createSuccessResponse(kidoosWithISOStrings, {
      message: `${kidoos.length} kidoo(s) trouvé(s)`,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des kidoos:', error);
    return createErrorResponse(KidoosErrors.INTERNAL_ERROR, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * POST /api/kidoos
 * Crée un nouveau kidoo pour l'utilisateur connecté
 */
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();
    const { userId } = request;

    // Validation des données
    const validationResult = createKidooInputSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return createErrorResponse(KidoosErrors.VALIDATION_ERROR, {
        message: firstError.message,
        field: firstError.path[0] as string,
        details: validationResult.error.issues,
      });
    }

    const { name, model, deviceId, macAddress, bluetoothMacAddress, firmwareVersion, brightness, sleepTimeout } = validationResult.data;

    // Vérifier si un kidoo avec ce deviceId existe déjà
    const existingKidoo = await prisma.kidoo.findUnique({
      where: { deviceId },
    });

    if (existingKidoo) {
      // Si le kidoo appartient déjà à cet utilisateur, retourner celui-ci
      if (existingKidoo.userId === userId) {
        return createErrorResponse(KidoosErrors.ALREADY_REGISTERED, {
          message: 'Ce Kidoo est déjà enregistré dans votre compte',
          field: 'deviceId',
        });
      }

      // Sinon, erreur car le deviceId est déjà utilisé par un autre utilisateur
      return createErrorResponse(KidoosErrors.ALREADY_REGISTERED, {
        message: 'Ce Kidoo est déjà enregistré par un autre utilisateur',
        field: 'deviceId',
      });
    }

    // Créer le nouveau kidoo
    const newKidoo = await prisma.kidoo.create({
      data: {
        name,
        model: model || 'classic', // Utiliser le modèle fourni ou 'classic' par défaut
        deviceId,
        macAddress: macAddress || null, // Adresse MAC WiFi (renvoyée par l'ESP32 lors du setup)
        bluetoothMacAddress: bluetoothMacAddress || null, // Adresse MAC Bluetooth (pour comparer lors des scans automatiques)
        firmwareVersion: firmwareVersion || null,
        brightness: brightness !== undefined ? brightness : undefined, // Brightness en pourcentage (0-100)
        sleepTimeout: sleepTimeout !== undefined ? sleepTimeout : undefined, // Sleep timeout en millisecondes
        userId,
        isConnected: false,
        isSynced: true, // Marqué comme synchronisé avec le serveur
      },
    });

    // Convertir les dates en ISO strings
    const kidooWithISOStrings = {
      ...newKidoo,
      lastConnected: newKidoo.lastConnected?.toISOString() || null,
      createdAt: newKidoo.createdAt.toISOString(),
      updatedAt: newKidoo.updatedAt.toISOString(),
    };

    return createSuccessResponse(kidooWithISOStrings, {
      message: 'Kidoo créé avec succès',
      status: 201,
    });
  } catch (error) {
    console.error('Erreur lors de la création du kidoo:', error);
    return createErrorResponse(KidoosErrors.INTERNAL_ERROR, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
