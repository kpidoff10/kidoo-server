/**
 * Route API pour obtenir un token MQTT temporaire
 * GET /api/mqtt-token
 *
 * Génère des credentials MQTT uniques par utilisateur avec JWT signé
 * Format: username=kidoo_user_{userId}, password=JWT_token
 */

import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { SignJWT } from 'jose';

/**
 * Générer un JWT signé pour utiliser comme password MQTT
 */
async function generateMqttJwt(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(
    process.env.MQTT_JWT_SECRET || 'kidoo-mqtt-secret-key-change-in-prod'
  );

  const jwt = await new SignJWT({ userId, type: 'mqtt' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret);

  return jwt;
}

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { userId } = request;

    if (!userId) {
      return createErrorResponse('UNAUTHORIZED', 401, {
        message: 'Utilisateur non authentifié',
      });
    }

    // Générer credentials uniques par user
    // Username = userId directement (pour identifier les apps)
    const mqttUsername = userId;
    const mqttPassword = await generateMqttJwt(userId);

    console.log('[MQTT-TOKEN] JWT généré pour user:', userId);

    return createSuccessResponse({
      mqttUrl: process.env.MQTT_BROKER_URL_CLIENT || 'ws://mqtt.kidoo-box.com:9001',
      mqttUsername,
      mqttPassword,
      expiresIn: 3600, // 1 heure
    });
  } catch (error) {
    console.error('[MQTT-TOKEN] Erreur:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
