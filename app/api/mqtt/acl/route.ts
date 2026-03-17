/**
 * Endpoint d'ACL MQTT pour EMQX
 * POST /api/mqtt/acl
 *
 * EMQX appelle cet endpoint pour vérifier si un user peut accéder à un topic
 * Format de la requête (form-encoded):
 *   username=kidoo_user_123
 *   clientid=kidoo-MAC
 *   ipaddr=192.168.1.1
 *   topic=kidoo/80B54ED96148/telemetry
 *   action=subscribe  (ou publish)
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Extraire le userId du username format: kidoo_user_{userId}
 */
function extractUserIdFromUsername(username: string): string | null {
  const match = username.match(/^kidoo_user_(.+)$/);
  return match ? match[1] : null;
}

/**
 * Vérifier si l'user peut accéder au topic
 * Rules:
 * - kidoo_user_* peut accéder à kidoo/+/telemetry (publier et souscrire)
 * - ESP32 (username=kidoo_app) peut publier sur ses topics
 */
function canAccessTopic(username: string, topic: string, action: string): boolean {
  // ESP32 : peut publier sur ses topics
  if (username === 'kidoo_app') {
    if (action === 'publish' && topic.startsWith('kidoo/')) {
      return true;
    }
    return false;
  }

  // App users: kidoo_user_*
  const userId = extractUserIdFromUsername(username);
  if (userId) {
    // Peut accéder à kidoo/+/telemetry (publier et souscrire)
    // TODO: Ajouter une vérification pour vérifier que l'user a vraiment ce device
    if (topic.match(/^kidoo\/[A-F0-9]{12}\/telemetry$/)) {
      return true;
    }
    return false;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Récupérer les données du body (form-encoded)
    const contentType = request.headers.get('content-type');
    let username = '';
    let topic = '';
    let action = '';

    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const data = await request.text();
      const params = new URLSearchParams(data);
      username = params.get('username') || '';
      topic = params.get('topic') || '';
      action = params.get('action') || '';
    } else {
      const body = await request.json();
      username = body.username || '';
      topic = body.topic || '';
      action = body.action || '';
    }

    console.log('[MQTT-ACL] Vérification ACL:', { username, topic, action });

    const allowed = canAccessTopic(username, topic, action);

    if (allowed) {
      console.log('[MQTT-ACL] ✓ Accès autorisé:', username, '->', topic, `(${action})`);
    } else {
      console.warn('[MQTT-ACL] ✗ Accès refusé:', username, '->', topic, `(${action})`);
    }

    return NextResponse.json(
      { result: allowed },
      { status: 200 }
    );
  } catch (error) {
    console.error('[MQTT-ACL] Erreur:', error);
    return NextResponse.json(
      { result: false },
      { status: 200 }
    );
  }
}
