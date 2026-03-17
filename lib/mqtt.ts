/**
 * MQTT Client Manager pour Kidoo
 *
 * Remplace mqtt avec Mosquitto broker self-hosted
 * Utilise mqtt.js pour les connexions persistantes
 * Les réponses sont gérées via EventEmitter (pas de polling History API)
 */

import mqtt, { MqttClient } from 'mqtt';
import { EventEmitter } from 'events';

// Singleton MQTT client + event emitter pour les réponses
let mqttClient: MqttClient | null = null;
const messageEmitter = new EventEmitter();

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://45.10.161.70:1883';

/**
 * Obtenir ou créer le client MQTT singleton
 */
function getMqttClient(): MqttClient {
  if (mqttClient && mqttClient.connected) {
    return mqttClient;
  }

  // Créer une nouvelle connexion si elle n'existe pas ou est fermée
  mqttClient = mqtt.connect(MQTT_BROKER_URL, {
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
    clientId: 'kidoo-server',
    username: 'server',
    password: process.env.MQTT_PASSWORD,
  });

  // S'abonner à tous les messages telemetry (wildcard)
  mqttClient.on('connect', () => {
    console.log('[MQTT] Connecté au broker');
    mqttClient!.subscribe('kidoo/+/telemetry');
  });

  // Traiter les messages reçus
  mqttClient.on('message', (topic, payload) => {
    try {
      // Convertir le payload (Buffer) en string
      const payloadStr = payload.toString('utf8').trim();

      // Vérifier que le payload n'est pas vide
      if (!payloadStr || payloadStr.length === 0) {
        console.warn('[MQTT] Payload vide reçu sur topic:', topic);
        return;
      }

      console.debug('[MQTT] Message reçu - topic:', topic, 'payload:', payloadStr);

      const msg = JSON.parse(payloadStr);
      // Extraire la MAC depuis le topic : kidoo/{MAC}/telemetry
      const parts = topic.split('/');
      if (parts.length >= 2) {
        const mac = parts[1];

        // Émettre l'événement (pour les clients en attente)
        messageEmitter.emit(`msg:${mac}`, msg);
        console.log('[MQTT] Message émis pour MAC:', mac, 'type:', msg.type || msg.status);
      }
    } catch (e) {
      console.error('[MQTT] Erreur parsing JSON:', e);
      console.error('[MQTT] Payload original:', payload);
    }
  });

  mqttClient.on('error', (error) => {
    console.error('[MQTT] Erreur client:', error);
  });

  mqttClient.on('offline', () => {
    console.warn('[MQTT] Client offline');
  });

  return mqttClient;
}

/**
 * Vérifier si MQTT est configuré
 */
export function isMqttConfigured(): boolean {
  return !!MQTT_BROKER_URL && MQTT_BROKER_URL.length > 0;
}

/**
 * Obtenir le topic de commande pour un device
 */
export function getMqttCmdTopic(macAddress: string): string {
  const cleanMac = macAddress.replace(/[:-]/g, '').toUpperCase();
  return `kidoo/${cleanMac}/cmd`;
}

/**
 * Obtenir le topic de télémétrie pour un device
 */
export function getMqttTelemetryTopic(macAddress: string): string {
  const cleanMac = macAddress.replace(/[:-]/g, '').toUpperCase();
  return `kidoo/${cleanMac}/telemetry`;
}

/**
 * Envoyer une commande au device
 * @param macAddress MAC address du device (ex: "AA:BB:CC:DD:EE:FF")
 * @param action Action à exécuter (ex: "get-info")
 * @param opts Options additionnelles (params, timeout, etc.)
 * @returns true si la publication réussit
 */
export async function sendCommand(
  macAddress: string,
  action: string,
  opts?: Record<string, unknown>
): Promise<boolean> {
  const client = getMqttClient();
  const topic = getMqttCmdTopic(macAddress);

  const message = {
    action,
    timestamp: Date.now(),
    ...opts,
  };

  return new Promise((resolve) => {
    client.publish(topic, JSON.stringify(message), (err) => {
      if (err) {
        console.error('[MQTT] Erreur publication:', err);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Attendre un message spécifique du device
 * Utilise un EventEmitter au lieu de polling (plus rapide + efficace)
 *
 * @param macAddress MAC address du device
 * @param messageType Type de message attendu (ex: "info", "env")
 * @param opts Options (timeoutMs, pollIntervalMs - ignorés avec MQTT)
 * @returns Message reçu ou null si timeout
 */
export async function waitForMessage(
  macAddress: string,
  messageType: string,
  opts?: { timeoutMs?: number; pollIntervalMs?: number }
): Promise<Record<string, unknown> | null> {
  const cleanMac = macAddress.replace(/[:-]/g, '').toUpperCase();
  const timeoutMs = opts?.timeoutMs ?? 5000;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      messageEmitter.off(`msg:${cleanMac}`, handler);
      resolve(null);
    }, timeoutMs);

    function handler(msg: Record<string, unknown>) {
      // Vérifier si le message correspond au type attendu
      if (msg.type === messageType) {
        clearTimeout(timer);
        messageEmitter.off(`msg:${cleanMac}`, handler);
        resolve(msg);
      }
    }

    messageEmitter.on(`msg:${cleanMac}`, handler);
  });
}

/**
 * Attendre un message spécifique pour une mise à jour firmware
 * Attend "firmware-update-done" ou "firmware-update-failed"
 *
 * @param macAddress MAC address du device
 * @param version Version firmware attendue
 * @param opts Options (timeoutMs, pollIntervalMs)
 * @returns Message reçu ou null si timeout
 */
export async function waitForFirmwareUpdateResult(
  macAddress: string,
  version: string,
  opts?: { timeoutMs?: number; pollIntervalMs?: number }
): Promise<Record<string, unknown> | null> {
  const cleanMac = macAddress.replace(/[:-]/g, '').toUpperCase();
  const timeoutMs = opts?.timeoutMs ?? 10 * 60 * 1000; // 10 minutes default

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      messageEmitter.off(`msg:${cleanMac}`, handler);
      resolve(null);
    }, timeoutMs);

    function handler(msg: Record<string, unknown>) {
      // Vérifier si c'est une réponse firmware-update
      if (
        (msg.type === 'firmware-update-done' ||
          msg.type === 'firmware-update-failed') &&
        msg.version === version
      ) {
        clearTimeout(timer);
        messageEmitter.off(`msg:${cleanMac}`, handler);
        resolve(msg);
      }
    }

    messageEmitter.on(`msg:${cleanMac}`, handler);
  });
}

/**
 * Publier un message directement sur le topic de commande
 * Utile pour les commandes ad-hoc sans attendre de réponse
 *
 * @param macAddress MAC address du device
 * @param message Message JSON à publier
 */
export async function publishToKidoo(
  macAddress: string,
  message: Record<string, unknown>
): Promise<boolean> {
  const client = getMqttClient();
  const topic = getMqttCmdTopic(macAddress);

  return new Promise((resolve) => {
    client.publish(topic, JSON.stringify(message), (err) => {
      if (err) {
        console.error('[MQTT] Erreur publication:', err);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Obtenir le dernier message reçu depuis un device
 * (Non disponible nativement avec MQTT - à éviter)
 *
 * Avec mqtt, on pouvait accéder à l'historique.
 * Avec MQTT, il faut envoyer une commande "get-env" et attendre la réponse.
 */
export async function getLatestEnvFromHistory(
  macAddress: string
): Promise<Record<string, unknown> | null> {
  // Envoyer une commande get-env et attendre la réponse
  await sendCommand(macAddress, 'get-env');
  return waitForMessage(macAddress, 'env', { timeoutMs: 5000 });
}

/**
 * Fermer la connexion MQTT
 */
export function closeMqtt(): Promise<void> {
  return new Promise((resolve) => {
    if (mqttClient) {
      mqttClient.end(true, () => {
        mqttClient = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}
