/**
 * Route API pour la config temps réel PubNub.
 * GET /api/kidoos/realtime-config
 *
 * Retourne subscribeKey et la liste des abonnements (channel + kidooId)
 * pour que l'app puisse s'abonner aux canaux des Kidoos de l'utilisateur.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { getKidooChannel, isPubNubConfigured } from '@/lib/pubnub';

export interface RealtimeConfigSubscription {
  channel: string;
  kidooId: string;
}

export interface RealtimeConfigResponse {
  subscribeKey: string;
  subscriptions: RealtimeConfigSubscription[];
}

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { userId } = authResult;

    if (!isPubNubConfigured()) {
      return NextResponse.json({
        success: true,
        data: { subscribeKey: '', subscriptions: [] } as RealtimeConfigResponse,
      });
    }

    const kidoos = await prisma.kidoo.findMany({
      where: { userId },
      select: { id: true, macAddress: true },
    });

    const subscriptions: RealtimeConfigSubscription[] = kidoos
      .filter((k) => k.macAddress)
      .map((k) => ({
        channel: getKidooChannel(k.macAddress!),
        kidooId: k.id,
      }));

    const subscribeKey = process.env.PUBNUB_SUBSCRIBE_KEY || '';

    return NextResponse.json({
      success: true,
      data: {
        subscribeKey,
        subscriptions,
      } as RealtimeConfigResponse,
    });
  } catch (error) {
    console.error('[REALTIME-CONFIG] Erreur:', error);
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
