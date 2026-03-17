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
import { getMqttTelemetryTopic, getMqttCmdTopic } from '@/lib/mqtt-topics';

export interface RealtimeConfigSubscription {
  topic: string;
  kidooId: string;
  mac: string;
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

    const brokerUrl = process.env.MQTT_BROKER_URL_CLIENT || process.env.MQTT_BROKER_URL || '';

    // Retourner config vide si pas de broker configuré
    if (!brokerUrl) {
      return NextResponse.json({
        success: true,
        data: { brokerUrl: '', subscriptions: [] } as RealtimeConfigResponse,
      });
    }

    const kidoos = await prisma.kidoo.findMany({
      where: { userId },
      select: { id: true, macAddress: true },
    });

    // Subscriptions pour les topics telemetry (app va écouter les réponses MQTT)
    const subscriptions: RealtimeConfigSubscription[] = kidoos
      .filter((k) => k.macAddress)
      .map((k) => ({
        topic: getMqttTelemetryTopic(k.macAddress!),
        kidooId: k.id,
        mac: k.macAddress!,
      }));

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
