/**
 * Route API pour obtenir un token MQTT temporaire
 * GET /api/devices/{mac}/mqtt-token
 *
 * Endpoint accessible par l'ESP32
 * Requête signée avec clé Ed25519
 */

import { NextResponse } from 'next/server';
import { withDeviceAuth, DeviceAuthenticatedRequest } from '@/lib/withDeviceAuth';

/**
 * Handler pour retourner les credentials MQTT
 * La vérification de signature Ed25519 est gérée par withDeviceAuth
 */
async function handler(
  request: DeviceAuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { mac } = await params;

  console.log(`[MQTT-TOKEN] Credentials demandées pour device: ${mac}`);

  // Signature valide (vérifiée par withDeviceAuth) - retourner les credentials MQTT
  // Tous les ESP32 utilisent les mêmes credentials fixes
  // L'authentification par device se fait via signature Ed25519
  return NextResponse.json({
    success: true,
    data: {
      mqttUrl: process.env.MQTT_BROKER_URL || 'mqtts://s27572bb.ala.us-east-1.emqxsl.com:8883',
      mqttUsername: 'esp32',
      mqttPassword: process.env.MQTT_PASSWORD || 'changeme',
      expiresIn: 3600,
    },
  });
}

export const GET = withDeviceAuth(handler);
