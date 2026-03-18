/**
 * Endpoint d'authentification MQTT pour EMQX
 * POST /api/mqtt/auth
 *
 * EMQX appelle cet endpoint pour valider les credentials MQTT
 * Format de la requête (form-encoded):
 *   username=kidoo_user_123
 *   password=jwt_token_or_hash
 *   clientid=kidoo-MAC
 *   ipaddr=192.168.1.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Identifier le type de client et extraire les infos
 * Formats:
 * - UUID (app): ccc16959-e2bd-4640-b5cd-99e6bb4c04b3
 * - MAC (ESP32): 80B54ED96148
 * - Server: server
 */
function identifyClient(username: string): { type: 'app' | 'device' | 'server'; id: string } {
  // Server
  if (username === 'server') {
    return { type: 'server', id: 'server' };
  }

  // UUID (app)
  if (username.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return { type: 'app', id: username };
  }

  // MAC address (ESP32) - 12 hex chars
  if (username.match(/^[0-9A-F]{12}$/i)) {
    return { type: 'device', id: username };
  }

  return { type: 'app', id: username }; // Fallback
}

/**
 * Valider que le password est un JWT signé valide
 */
async function validateJwtPassword(password: string, expectedUserId: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(
      process.env.MQTT_JWT_SECRET || 'kidoo-mqtt-secret-key-change-in-prod'
    );

    const { payload } = await jwtVerify(password, secret);

    // Vérifier que le userId dans le JWT correspond
    if (payload.userId !== expectedUserId) {
      console.warn('[MQTT-AUTH] JWT userId ne correspond pas:', payload.userId, '!==', expectedUserId);
      return false;
    }

    // Vérifier que c'est un token MQTT
    if (payload.type !== 'mqtt') {
      console.warn('[MQTT-AUTH] JWT type invalide:', payload.type);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[MQTT-AUTH] Erreur validation JWT:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Récupérer les données du body (form-encoded)
    const contentType = request.headers.get('content-type');
    let username = '';
    let password = '';

    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const data = await request.text();
      const params = new URLSearchParams(data);
      username = params.get('username') || '';
      password = params.get('password') || '';
    } else {
      const body = await request.json();
      username = body.username || '';
      password = body.password || '';
    }

    console.log('[MQTT-AUTH] Authentification demandée pour user:', username);

    // Identifier le type de client (app, device, server)
    const client = identifyClient(username);
    console.log('[MQTT-AUTH] Client identifié:', { type: client.type, id: client.id });

    // Validation selon le type de client
    if (client.type === 'server') {
      // Server: plus supporté (serverless)
      console.warn('[MQTT-AUTH] Server connection not supported');
      return NextResponse.json(
        { result: false },
        { status: 200 }
      );
    } else if (client.type === 'device') {
      // Device (ESP32): valider que password = MAC address
      if (password !== client.id) {
        console.warn('[MQTT-AUTH] Password invalide pour device:', client.id);
        return NextResponse.json(
          { result: false },
          { status: 200 }
        );
      }
    } else {
      // App: valider le JWT password
      const jwtValid = await validateJwtPassword(password, client.id);
      if (!jwtValid) {
        console.warn('[MQTT-AUTH] JWT invalide pour app:', client.id);
        return NextResponse.json(
          { result: false },
          { status: 200 }
        );
      }
    }

    console.log('[MQTT-AUTH] ✓ Authentification réussie:', { type: client.type, id: client.id });

    return NextResponse.json(
      { result: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('[MQTT-AUTH] Erreur:', error);
    return NextResponse.json(
      { result: false },
      { status: 200 }  // EMQX veut un 200 même en cas d'erreur
    );
  }
}
