/**
 * Endpoint pour mettre à jour les infos device après get-info MQTT
 * POST /api/kidoos/{id}/device-info
 *
 * Appelée par l'app après avoir reçu les infos du device via MQTT
 * Met à jour : firmwareVersion + storage en DB
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

interface DeviceInfoBody {
  firmwareVersion?: string;
  storage?: {
    total: number;
    free: number;
    used: number;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { userId } = authResult;
    const { id } = await params;

    // Vérifier que le Kidoo existe et appartient à l'utilisateur
    const kidoo = await prisma.kidoo.findUnique({
      where: { id },
      include: { configBasic: true, configDream: true, configSound: true },
    });

    if (!kidoo) {
      return NextResponse.json(
        { success: false, error: 'Kidoo non trouvé' },
        { status: 404 }
      );
    }

    if (kidoo.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // Récupérer les données du body
    const body = (await request.json()) as DeviceInfoBody;

    // Mettre à jour la DB avec les infos reçues
    await updateKidooInfo(kidoo.id, kidoo.model, body);

    return NextResponse.json({
      success: true,
      data: { id: kidoo.id, updated: true },
    });
  } catch (error) {
    console.error('[DEVICE-INFO] Erreur:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json(
      {
        success: false,
        error: 'Une erreur est survenue',
        details: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Met à jour les informations du Kidoo en base de données
 * Traite le stockage pour tous les modèles (Basic, Dream, Sound)
 */
async function updateKidooInfo(
  kidooId: string,
  model: string,
  info: DeviceInfoBody
) {
  try {
    // Mettre à jour firmwareVersion sur le Kidoo
    if (info.firmwareVersion) {
      await prisma.kidoo.update({
        where: { id: kidooId },
        data: { firmwareVersion: info.firmwareVersion.trim() },
      });
    }

    // Extraire et mettre à jour les infos de stockage
    if (info.storage) {
      const storageUpdate = {
        storageTotalBytes: BigInt(info.storage.total),
        storageFreeBytes: BigInt(info.storage.free),
        storageUsedBytes: BigInt(info.storage.used),
        storageLastUpdated: new Date(),
      };

      // Mettre à jour la config de stockage selon le modèle
      if (model === 'basic') {
        await prisma.kidooConfigBasic.upsert({
          where: { kidooId },
          update: storageUpdate,
          create: {
            kidooId,
            ...storageUpdate,
          },
        });
      } else if (model === 'dream') {
        await prisma.kidooConfigDream.upsert({
          where: { kidooId },
          update: storageUpdate,
          create: {
            kidooId,
            ...storageUpdate,
          },
        });
      } else if (model === 'sound') {
        await prisma.kidooConfigSound.upsert({
          where: { kidooId },
          update: storageUpdate,
          create: {
            kidooId,
            ...storageUpdate,
          },
        });
      }

      console.log(
        `[DEVICE-INFO] Base de données mise à jour pour ${kidooId} (modèle: ${model})`
      );
    }
  } catch (error) {
    console.error('[DEVICE-INFO] Erreur lors de la mise à jour de la base:', error);
    // Ne pas faire échouer la requête si la mise à jour échoue
  }
}
