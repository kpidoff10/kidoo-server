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
  // Username = MAC address (pour identifier les devices ESP32)
  // Password = MAC address (pour validation simple)
  return NextResponse.json({
    success: true,
    data: {
      mqttUrl: process.env.MQTT_BROKER_URL || 'mqtts://mqtt.kidoo-box.com:8883',
      mqttUsername: mac,
      mqttPassword: mac,
      expiresIn: 3600,
    },
  });
}

export const GET = withDeviceAuth(handler);
