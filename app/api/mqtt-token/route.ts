/**
 * Route API pour obtenir les credentials MQTT
 * GET /api/mqtt-token
 *
 * Retourne les credentials MQTT fixes pour l'app
 * Tous les utilisateurs partagent les mêmes credentials (authentification via NextAuth)
 */

import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { userId } = request;

    if (!userId) {
      return createErrorResponse('UNAUTHORIZED', 401, {
        message: 'Utilisateur non authentifié',
      });
    }

    const mqttUrl = process.env.MQTT_BROKER_URL_CLIENT || 'wss://s27572bb.ala.us-east-1.emqxsl.com:8084/mqtt';
    const mqttUsername = 'app';
    const mqttPassword = process.env.MQTT_PASSWORD_APP || 'changeme';

    console.log('[MQTT-TOKEN] Credentials retournées pour user:', userId);
    console.log('[MQTT-TOKEN] URL:', mqttUrl);
    console.log('[MQTT-TOKEN] Username:', mqttUsername);
    console.log('[MQTT-TOKEN] Password length:', mqttPassword.length);

    // Retourner les credentials MQTT fixes
    // Tous les utilisateurs authentifiés accèdent au même broker avec les mêmes credentials
    return createSuccessResponse({
      mqttUrl,
      mqttUsername,
      mqttPassword,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('[MQTT-TOKEN] Erreur:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
