/**
 * Route API pour demander les informations d'un Kidoo
 * GET /api/kidoos/[id]/commands/get-info
 * 
 * Cette route:
 * 1. Envoie une commande get-info à l'ESP32 via MQTT
 * 2. Attend la réponse via l'API History de mqtt (timeout 5s)
 * 3. Met à jour la base de données avec les nouvelles infos
 * 4. Si timeout, renvoie les dernières valeurs connues de la base
 * 
 * Modèles autorisés: tous
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { sendCommand, isMqttConfigured, waitForMessage } from '@/lib/mqtt';
import { macEquals, formatMac } from '@/lib/mac-utils';
import { KidooCommandAction } from '@kidoo/shared';
import { Kidoo, KidooConfigBasic } from '@kidoo/shared/prisma';

// Timeout pour attendre la réponse de l'ESP32 (en ms)
const RESPONSE_TIMEOUT_MS = 5000;

/**
 * GET /api/kidoos/[id]/commands/get-info
 * Demande au Kidoo d'envoyer ses informations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification
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

    // Vérifier que le Kidoo a une adresse MAC
    if (!kidoo.macAddress) {
      return NextResponse.json(
        { success: false, error: 'Kidoo non configuré (adresse MAC manquante)' },
        { status: 400 }
      );
    }

    // Vérifier mqtt
    if (!isMqttConfigured()) {
      // MQTT non configuré, renvoyer les données de la base si disponibles
      return returnCachedData(kidoo, 'MQTT non configuré');
    }

    const sent = await sendCommand(kidoo.macAddress, KidooCommandAction.GetInfo);

    if (!sent) {
      // Échec d'envoi, renvoyer les données de la base si disponibles
      return returnCachedData(kidoo, 'Échec de l\'envoi de la commande');
    }

    const response = await waitForMessage(kidoo.macAddress, 'info', {
      timeoutMs: RESPONSE_TIMEOUT_MS,
      pollIntervalMs: 500,
    });

    if (response) {
      // Mettre à jour l'adresse MAC si elle est différente (corriger les erreurs d'enregistrement)
      if (response.mac && typeof response.mac === 'string') {
        // Comparer les MACs (en normalisant les formats)
        if (!macEquals(kidoo.macAddress, response.mac)) {
          await prisma.kidoo.update({
            where: { id: kidoo.id },
            data: { macAddress: formatMac(response.mac) },
          });
          // Mettre à jour la variable locale pour les prochaines opérations
          kidoo.macAddress = response.mac;
        }
      }
      
      // Mettre à jour la base de données avec les nouvelles infos
      await updateKidooInfo(kidoo.id, kidoo.model, response);
      
      return NextResponse.json({
        success: true,
        data: response,
        source: 'live',
        message: 'Informations récupérées en temps réel',
      });
    }

    // Timeout - renvoyer les données de la base
    console.log(`[GET-INFO] Timeout, renvoi des données en cache`);
    return returnCachedData(kidoo, 'Timeout - appareil peut-être hors ligne');

  } catch (error) {
    console.error('Erreur lors de la demande d\'informations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

    return NextResponse.json(
      {
        success: false,
        error: 'Une erreur est survenue',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

// Type pour le kidoo avec sa config
type ConfigWithStorage = {
  storageTotalBytes?: bigint | null;
  storageFreeBytes?: bigint | null;
  storageUsedBytes?: bigint | null;
  storageLastUpdated?: Date | null;
  updatedAt?: Date | null;
};

type KidooWithConfig = Pick<Kidoo, 'id' | 'name' | 'model' | 'macAddress'> & {
  configBasic: ConfigWithStorage | null;
  configDream: ConfigWithStorage | null;
  configSound: ConfigWithStorage | null;
};

/**
 * Renvoie les données en cache de la base de données
 * Utilise la config appropriée selon le modèle (Dream, Sound, Basic)
 */
function returnCachedData(kidoo: KidooWithConfig, reason: string) {
  // Sélectionner la config appropriée selon le modèle
  const config =
    kidoo.model === 'dream' ? kidoo.configDream :
    kidoo.model === 'sound' ? kidoo.configSound :
    kidoo.configBasic;

  // Construire les données depuis la base
  const cachedData = {
    type: 'info',
    device: kidoo.name,
    mac: kidoo.macAddress,
    model: kidoo.model.toLowerCase(),
    // Données de la config si disponibles
    storage: config?.storageTotalBytes ? {
      total: Number(config.storageTotalBytes),
      free: Number(config.storageFreeBytes ?? 0),
      used: Number(config.storageUsedBytes ?? 0),
    } : null,
    lastUpdated: config?.storageLastUpdated?.toISOString() ?? config?.updatedAt?.toISOString() ?? null,
  };

  return NextResponse.json({
    success: true,
    data: cachedData,
    source: 'cache',
    message: reason,
  });
}

/**
 * Met à jour les informations du Kidoo en base de données
 * Traite le stockage pour tous les modèles (Basic, Dream, Sound)
 */
async function updateKidooInfo(
  kidooId: string,
  model: string,
  info: Record<string, unknown>
) {
  try {
    // Mettre à jour brightness, sleepTimeout et firmwareVersion sur le Kidoo (commun à tous les modèles)
    const kidooUpdate: { brightness?: number; sleepTimeout?: number; firmwareVersion?: string | null } = {};
    if (typeof info.brightness === 'number') kidooUpdate.brightness = info.brightness;
    if (typeof info.sleepTimeout === 'number') kidooUpdate.sleepTimeout = info.sleepTimeout;
    if (typeof info.firmwareVersion === 'string' && info.firmwareVersion.trim()) {
      kidooUpdate.firmwareVersion = info.firmwareVersion.trim();
    }

    if (Object.keys(kidooUpdate).length > 0) {
      await prisma.kidoo.update({
        where: { id: kidooId },
        data: kidooUpdate,
      });
    }

    // Extraire les infos de stockage
    const storage = info.storage as { total?: number; free?: number; used?: number } | undefined;
    console.log(`[GET-INFO] Storage info:`, storage);
    console.log(`[GET-INFO] Storage.total type:`, typeof storage?.total, `value:`, storage?.total);

    const storageUpdate = storage?.total ? {
      storageTotalBytes: BigInt(storage.total),
      storageFreeBytes: storage.free ? BigInt(storage.free) : undefined,
      storageUsedBytes: storage.used ? BigInt(storage.used) : undefined,
      storageLastUpdated: new Date(),
    } : {};

    console.log(`[GET-INFO] StorageUpdate empty?:`, Object.keys(storageUpdate).length === 0);
    console.log(`[GET-INFO] StorageUpdate for model ${model}:`, storageUpdate);

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
      console.log(`[GET-INFO] Updating KidooConfigSound for ${kidooId}`);
      await prisma.kidooConfigSound.upsert({
        where: { kidooId },
        update: storageUpdate,
        create: {
          kidooId,
          ...storageUpdate,
        },
      });
      console.log(`[GET-INFO] KidooConfigSound updated successfully`);
    }

    console.log(`[GET-INFO] Base de données mise à jour pour ${kidooId} (modèle: ${model})`);
  } catch (error) {
    console.error('[GET-INFO] Erreur lors de la mise à jour de la base:', error);
    // Ne pas faire échouer la requête si la mise à jour échoue
  }
}
