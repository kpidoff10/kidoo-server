/**
 * Route API pour la config temps réel MQTT.
 * GET /api/kidoos/realtime-config
 *
 * Retourne brokerUrl et la liste des abonnements (topic + kidooId)
 * pour que l'app puisse se connecter au broker MQTT et s'abonner aux topics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { isMqttConfigured, getMqttTelemetryTopic } from '@/lib/mqtt';

export interface RealtimeConfigSubscription {
  topic: string;
  kidooId: string;
}

export interface RealtimeConfigResponse {
  brokerUrl: string;
  subscriptions: RealtimeConfigSubscription[];
}

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { userId } = authResult;

    if (!isMqttConfigured()) {
      return NextResponse.json({
        success: true,
        data: { brokerUrl: '', subscriptions: [] } as RealtimeConfigResponse,
      });
    }

    const kidoos = await prisma.kidoo.findMany({
      where: { userId },
      select: { id: true, macAddress: true },
    });

    const subscriptions: RealtimeConfigSubscription[] = kidoos
      .filter((k) => k.macAddress)
      .map((k) => ({
        topic: getMqttTelemetryTopic(k.macAddress!),
        kidooId: k.id,
      }));

    const brokerUrl = process.env.MQTT_BROKER_URL_CLIENT || process.env.MQTT_BROKER_URL || '';

    return NextResponse.json({
      success: true,
      data: {
        brokerUrl,
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
