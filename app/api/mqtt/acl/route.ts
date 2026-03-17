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
 * Vérifier si l'user peut accéder au topic
 * Rules:
 * - App (UUID): peut subscribe + publish sur kidoo/+/telemetry ET kidoo/+/cmd
 * - ESP32 (MAC): peut publish sur kidoo/{sienMAC}/telemetry ET subscribe sur kidoo/{sienMAC}/cmd
 * - Server: accès complet
 */
function canAccessTopic(username: string, topic: string, action: string): boolean {
  const client = identifyClient(username);

  if (client.type === 'server') {
    // Server: accès complet à tous les topics
    return true;
  }

  if (client.type === 'device') {
    // ESP32 (MAC): peut publier sur son /telemetry ET subscribe sur son /cmd
    const mac = client.id;
    if (action === 'publish' && topic === `kidoo/${mac}/telemetry`) {
      return true;
    }
    if (action === 'subscribe' && topic === `kidoo/${mac}/cmd`) {
      return true;
    }
    return false;
  }

  if (client.type === 'app') {
    // App (UUID): peut subscribe ET publish sur /telemetry ET /cmd
    // TODO: Ajouter une vérification DB pour vérifier que l'app a vraiment ce device
    if (topic.match(/^kidoo\/[A-F0-9]{12}\/telemetry$/) || topic.match(/^kidoo\/[A-F0-9]{12}\/cmd$/)) {
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
