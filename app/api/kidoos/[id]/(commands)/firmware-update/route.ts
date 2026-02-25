/**
 * Route API pour lancer une mise à jour firmware sur un Kidoo
 * POST /api/kidoos/[id]/firmware-update
 * (Le dossier (commands) est un route group Next.js → n'apparaît pas dans l'URL)
 *
 * Body: { "version": "1.0.1" }
 *
 * Même principe que get-info : envoie la commande via PubNub puis attend la réponse
 * (firmware-update-done ou firmware-update-failed) via l'API History.
 * Timeout explicite : si aucune réponse de l'ESP après OTA_RESPONSE_TIMEOUT_MS, retourne 408.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { KidooCommandAction } from '@kidoo/shared';
import { sendCommand, isPubNubConfigured, waitForFirmwareUpdateResult } from '@/lib/pubnub';
import { firmwareUpdateCommandSchema } from '@/shared';

/** Délai max d'attente de la réponse OTA (done/failed) de l'ESP. Au-delà → 408 Request Timeout. */
const OTA_RESPONSE_TIMEOUT_MS = 5 * 60 * 1000; // 5 min

/**
 * POST /api/kidoos/[id]/firmware-update
 * Envoie la commande OTA puis attend la réponse de l'ESP (done/failed).
 */
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

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body vide ou invalide
    }

    const validation = firmwareUpdateCommandSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'La version est requise',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { version } = validation.data;

    const kidoo = await prisma.kidoo.findUnique({
      where: { id },
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

    if (!kidoo.macAddress) {
      return NextResponse.json(
        { success: false, error: 'Kidoo non configuré (adresse MAC manquante)' },
        { status: 400 }
      );
    }

    if (!isPubNubConfigured()) {
      return NextResponse.json(
        { success: false, error: 'PubNub non configuré sur le serveur' },
        { status: 503 }
      );
    }

    const sent = await sendCommand(kidoo.macAddress, KidooCommandAction.FirmwareUpdate, {
      params: { version },
      kidooId: id,
    });

    if (!sent) {
      return NextResponse.json(
        { success: false, error: "Échec de l'envoi de la commande au Kidoo" },
        { status: 502 }
      );
    }

    // Attendre la réponse de l'ESP (done/failed) comme pour get-info
    const result = await waitForFirmwareUpdateResult(
      kidoo.macAddress,
      version,
      OTA_RESPONSE_TIMEOUT_MS,
      1500,
      { kidooId: id, action: KidooCommandAction.FirmwareUpdate }
    );

    if (result === null) {
      return NextResponse.json(
        {
          success: false,
          error: 'timeout',
          message: 'Aucune réponse du Kidoo dans le délai imparti. Vérifiez qu\'il est connecté au WiFi et relancez si besoin.',
        },
        { status: 408 }
      );
    }

    if (result.status === 'done') {
      await prisma.kidoo.update({
        where: { id: kidoo.id },
        data: { firmwareVersion: result.version },
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Erreur lors du lancement de la mise à jour firmware:', error);
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
