/**
 * Route API pour récupérer température, humidité, pression (capteur env).
 * GET /api/kidoos/[id]/commands/get-env
 *
 * Envoie get-env via PubNub, attend la réponse type "env" (timeout 5s).
 * Générique : tout modèle peut être interrogé ; le device renvoie available: false si pas de capteur.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { KidooEnvResponse } from '@kidoo/shared';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { KidooCommandAction } from '@kidoo/shared';
import { sendCommand, isPubNubConfigured, waitForMessage, getLatestEnvFromHistory } from '@/lib/pubnub';

const RESPONSE_TIMEOUT_MS = 8000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
 
  const { id } = await params;
  try {
    const authResult = requireAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { userId } = authResult;

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
      return NextResponse.json({
        success: true,
        data: { available: false, error: 'PubNub non configuré' } as KidooEnvResponse,
      });
    }

    // Vérifier d'abord si l'ESP a déjà publié (temp/humidité change en temps réel)
    const latestEnv = await getLatestEnvFromHistory(kidoo.macAddress);
    if (latestEnv && typeof latestEnv.available === 'boolean') {
      const rawPressure = latestEnv.pressurePa != null ? Number(latestEnv.pressurePa) : null;
      const pressurePa =
        rawPressure != null && rawPressure >= 10000 && rawPressure <= 120000 ? rawPressure : null;
      const data: KidooEnvResponse = {
        available: latestEnv.available,
        temperatureC: latestEnv.temperatureC != null ? Number(latestEnv.temperatureC) : null,
        humidityPercent: latestEnv.humidityPercent != null ? Number(latestEnv.humidityPercent) : null,
        pressurePa,
        error: typeof latestEnv.error === 'string' ? latestEnv.error : undefined,
      };
      return NextResponse.json({ success: true, data });
    }

    const sent = await sendCommand(kidoo.macAddress, KidooCommandAction.GetEnv, { kidooId: id });
    if (!sent) {
      return NextResponse.json({
        success: true,
        data: { available: false, error: 'Échec envoi commande' } as KidooEnvResponse,
      });
    }


    let response = await waitForMessage(kidoo.macAddress, 'env', {
      timeoutMs: RESPONSE_TIMEOUT_MS,
      pollIntervalMs: 300,
      kidooId: id,
      action: KidooCommandAction.GetEnv,
    });

    // Fallback : le message a pu arriver pendant le timeout, vérifier l'historique une dernière fois
    if (!response) {
      response = (await getLatestEnvFromHistory(kidoo.macAddress)) as Record<string, unknown> | null;
    }

    if (response && typeof response.available === 'boolean') {
      const rawPressure = response.pressurePa != null ? Number(response.pressurePa) : null;
      const pressurePa =
        rawPressure != null && rawPressure >= 10000 && rawPressure <= 120000 ? rawPressure : null;
      const data: KidooEnvResponse = {
        available: response.available,
        temperatureC: response.temperatureC != null ? Number(response.temperatureC) : null,
        humidityPercent: response.humidityPercent != null ? Number(response.humidityPercent) : null,
        pressurePa,
        error: typeof response.error === 'string' ? response.error : undefined,
      };
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({
      success: true,
      data: { available: false, error: 'Pas de réponse (timeout ou capteur absent)' } as KidooEnvResponse,
    });
  } catch (error) {
    console.error('[GET-ENV] Erreur:', error);
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
