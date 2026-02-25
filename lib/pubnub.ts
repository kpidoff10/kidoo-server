/**
 * Service PubNub pour publier des commandes aux devices Kidoo (ESP32)
 * 
 * Chaque Kidoo écoute sur un channel unique basé sur son adresse MAC:
 * - Channel format: kidoo-{MAC_ADDRESS} (ex: kidoo-AABBCCDDEEFF)
 * 
 * @example
 * import { publishToKidoo } from '@/lib/pubnub';
 * import { KidooCommandAction } from '@kidoo/shared';
 * await sendCommand(mac, KidooCommandAction.GetInfo, { kidooId: id });
 */

import chalk from 'chalk';
import { KidooCommandAction } from '@kidoo/shared';

// Configuration PubNub depuis les variables d'environnement
const PUBNUB_PUBLISH_KEY = process.env.PUBNUB_PUBLISH_KEY || '';
const PUBNUB_SUBSCRIBE_KEY = process.env.PUBNUB_SUBSCRIBE_KEY || '';
const PUBNUB_ORIGIN = 'ps.pndsn.com';

/**
 * Vérifie si PubNub est configuré
 */
export function isPubNubConfigured(): boolean {
  return PUBNUB_PUBLISH_KEY.length > 0 && PUBNUB_SUBSCRIBE_KEY.length > 0;
}

/**
 * Construit le nom du channel PubNub pour un Kidoo
 * @param macAddress L'adresse MAC du Kidoo (avec ou sans séparateurs)
 * @returns Le nom du channel (ex: kidoo-AABBCCDDEEFF)
 */
export function getKidooChannel(macAddress: string): string {
  // Nettoyer l'adresse MAC (enlever les : et -)
  const cleanMac = macAddress.replace(/[:-]/g, '').toUpperCase();
  return `kidoo-${cleanMac}`;
}

/**
 * Encode un message pour l'URL PubNub
 */
function encodeMessage(message: string): string {
  let encoded = message;
  
  // Si ce n'est pas déjà un JSON, l'envelopper dans des guillemets
  if (!message.startsWith('{') && !message.startsWith('[')) {
    encoded = `"${message}"`;
  }
  
  // URL encode les caractères spéciaux
  encoded = encoded
    .replace(/"/g, '%22')
    .replace(/ /g, '%20')
    .replace(/{/g, '%7B')
    .replace(/}/g, '%7D')
    .replace(/:/g, '%3A')
    .replace(/,/g, '%2C')
    .replace(/\[/g, '%5B')
    .replace(/\]/g, '%5D');
  
  return encoded;
}

/**
 * Publie un message sur un channel PubNub
 * @param channel Le nom du channel
 * @param message Le message à publier (objet ou string)
 * @returns true si la publication réussit
 */
export async function publishToChannel(
  channel: string,
  message: Record<string, unknown> | string
): Promise<boolean> {
  if (!isPubNubConfigured()) {
    console.warn('[PUBNUB] PubNub non configuré (clés manquantes)');
    return false;
  }

  try {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    const encodedMessage = encodeMessage(messageStr);
    const url = `https://${PUBNUB_ORIGIN}/publish/${PUBNUB_PUBLISH_KEY}/${PUBNUB_SUBSCRIBE_KEY}/0/${channel}/0/${encodedMessage}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const responseText = await response.text();

    if (response.ok) {
      return true;
    }
    console.error(`[PUBNUB] Erreur publication: ${response.status} - ${responseText}`);
    return false;
  } catch (error) {
    console.error('[PUBNUB] Erreur lors de la publication:', error);
    return false;
  }
}

/**
 * Publie un message vers un Kidoo spécifique
 * @param macAddress L'adresse MAC du Kidoo
 * @param message Le message/commande à envoyer
 * @returns true si la publication réussit
 */
export async function publishToKidoo(
  macAddress: string,
  message: Record<string, unknown> | string
): Promise<boolean> {
  const channel = getKidooChannel(macAddress);
  return publishToChannel(channel, message);
}

export interface SendCommandOptions {
  /** Paramètres de la commande envoyés à l'ESP */
  params?: Record<string, unknown>;
  /** kidooId pour les logs */
  kidooId?: string;
}

/**
 * Envoie une commande à un Kidoo
 * @param macAddress L'adresse MAC du Kidoo
 * @param action Le nom de l'action (ex: 'brightness', 'get-info')
 * @param opts params (payload) et/ou kidooId (logs)
 * @returns true si la publication réussit
 */
export async function sendCommand(
  macAddress: string,
  action: string,
  opts?: SendCommandOptions
): Promise<boolean> {
  const params = opts?.params ?? {};
  const message = {
    action,
    ...params,
    timestamp: Date.now(),
  };
  const channel = getKidooChannel(macAddress);
  const label = opts?.kidooId ? 'kidooId' : 'channel';
  const value = opts?.kidooId ?? channel;
  console.log('[PUBNUB]', chalk.blue('Envoyé'), 'action:', chalk.green(action), `${label}:`, chalk.green(value));
  return publishToKidoo(macAddress, message);
}

// Types pour les commandes
export interface CommandResult {
  success: boolean;
  error?: string;
}

/**
 * Récupère l'historique des messages d'un channel PubNub
 * @param channel Le nom du channel
 * @param count Nombre de messages à récupérer (défaut: 1)
 * @param afterTimetoken Timetoken après lequel récupérer les messages (optionnel)
 * @returns Les messages avec leurs timetokens ou null en cas d'erreur
 */
export async function fetchHistory(
  channel: string,
  count: number = 1,
  afterTimetoken?: string
): Promise<{ message: Record<string, unknown>; timetoken: string }[] | null> {
  if (!isPubNubConfigured()) {
    console.warn('[PUBNUB] PubNub non configuré (clés manquantes)');
    return null;
  }

  try {
    let url = `https://${PUBNUB_ORIGIN}/v2/history/sub-key/${PUBNUB_SUBSCRIBE_KEY}/channel/${channel}?count=${count}&include_token=true`;
    if (afterTimetoken) {
      url += `&end=${afterTimetoken}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error(`[PUBNUB] Erreur history: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Format PubNub: [[msg1, msg2, ...], startTimetoken, endTimetoken]
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const rawMessages = data[0] as unknown[];
      const endTimetoken = typeof data[2] === 'string' ? data[2] : String(data[2] ?? '');
      return rawMessages.map((msg) => ({
        message: (typeof msg === 'object' && msg !== null && 'message' in msg)
          ? (msg as { message: unknown }).message
          : msg,
        timetoken: endTimetoken,
      })) as { message: Record<string, unknown>; timetoken: string }[];
    }

    console.log('[PUBNUB] Unexpected history format');
    return null;
  } catch (error) {
    console.error('[PUBNUB] Erreur lors de la récupération de l\'historique:', error);
    return null;
  }
}

/**
 * Récupère le dernier message env dans l'historique (ESP publie quand temp/humidité change)
 * @param macAddress L'adresse MAC du Kidoo
 * @returns Le message env ou null si non trouvé
 */
export async function getLatestEnvFromHistory(
  macAddress: string
): Promise<Record<string, unknown> | null> {
  const channel = getKidooChannel(macAddress);
  const history = await fetchHistory(channel, 20);
  if (!history || history.length === 0) return null;

  for (let i = history.length - 1; i >= 0; i--) {
    let msg = history[i].message;
    if (typeof msg === 'string') {
      try {
        const normalized = (msg as string).replace(/:nan\b/g, ':null');
        msg = JSON.parse(normalized) as Record<string, unknown>;
      } catch {
        continue;
      }
    }
    if (msg && typeof msg === 'object' && msg.type === 'env') {
      return msg as Record<string, unknown>;
    }
  }
  return null;
}

/**
 * Récupère l'historique des messages d'un Kidoo
 * @param macAddress L'adresse MAC du Kidoo
 * @param count Nombre de messages à récupérer (défaut: 1)
 * @returns Les messages ou null en cas d'erreur
 */
export async function fetchKidooHistory(
  macAddress: string,
  count: number = 1
): Promise<Record<string, unknown>[] | null> {
  const channel = getKidooChannel(macAddress);
  const history = await fetchHistory(channel, count);
  // Extraire juste les messages (sans les timetokens)
  return history?.map(item => item.message) ?? null;
}

export interface WaitForMessageOptions {
  /** Timeout en ms (défaut: 5000) */
  timeoutMs?: number;
  /** Intervalle de polling en ms (défaut: 500) */
  pollIntervalMs?: number;
  /** Pour les logs */
  kidooId?: string;
  /** Pour les logs */
  action?: KidooCommandAction;
}

/**
 * Attend un message de type spécifique sur un channel avec timeout
 * @param macAddress L'adresse MAC du Kidoo
 * @param messageType Le type de message attendu (ex: 'info', 'env')
 * @param opts timeoutMs, pollIntervalMs, kidooId, action
 * @returns Le message trouvé ou null si timeout
 */
export async function waitForMessage(
  macAddress: string,
  messageType: string,
  opts?: WaitForMessageOptions
): Promise<Record<string, unknown> | null> {
  const timeoutMs = opts?.timeoutMs ?? 5000;
  const pollIntervalMs = opts?.pollIntervalMs ?? 500;
  const startTime = Date.now();
  const channel = getKidooChannel(macAddress);

  const initialHistory = await fetchHistory(channel, 1);
  let afterTimetoken: string | undefined;

  if (initialHistory && initialHistory.length > 0) {
    afterTimetoken = initialHistory[0].timetoken;
  }

  while (Date.now() - startTime < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    const messages = await fetchHistory(channel, 10, afterTimetoken);

    if (messages && messages.length > 0) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const item = messages[i];
        let msg = item.message;
        if (typeof msg === 'string') {
          try {
            const normalized = (msg as string).replace(/:nan\b/g, ':null');
            msg = JSON.parse(normalized) as Record<string, unknown>;
          } catch {
            continue;
          }
        }
        if (msg && typeof msg === 'object' && msg.type === messageType) {
          return msg as Record<string, unknown>;
        }
      }
      afterTimetoken = messages[messages.length - 1].timetoken;
    }
  }

  if (opts?.kidooId) {
    const actionVal = opts.action ?? '?';
    console.log('[PUBNUB] Timeout', 'action:', chalk.red(actionVal), 'kidooId:', chalk.red(opts.kidooId));
  }
  return null;
}

/**
 * Attend la réponse OTA de l'ESP (firmware-update-done ou firmware-update-failed) pour une version donnée.
 * Même principe que waitForMessage (get-info) : envoi commande puis attente de la réponse via History.
 * @param macAddress MAC du Kidoo
 * @param version Version cible (pour filtrer les messages)
 * @param timeoutMs Timeout en ms (ex: 5 min). Au-delà, retourne null.
 * @param pollIntervalMs Intervalle de poll (ex: 1500 ms)
 * @param opts kidooId et action optionnels pour les logs
 * @returns { status: 'done', version } | { status: 'failed', error } | null (timeout)
 */
export async function waitForFirmwareUpdateResult(
  macAddress: string,
  version: string,
  timeoutMs: number = 5 * 60 * 1000,
  pollIntervalMs: number = 1500,
  opts?: { kidooId?: string; action?: KidooCommandAction }
): Promise<{ status: 'done'; version: string } | { status: 'failed'; error: string } | null> {
  const startTime = Date.now();
  const channel = getKidooChannel(macAddress);

  const initialHistory = await fetchHistory(channel, 1);
  let afterTimetoken: string | undefined;

  if (initialHistory && initialHistory.length > 0) {
    afterTimetoken = initialHistory[0].timetoken;
  }

  while (Date.now() - startTime < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

    const messages = await fetchHistory(channel, 20, afterTimetoken);

    if (messages && messages.length > 0) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const item = messages[i];
        let msg = item.message;
        if (typeof msg === 'string') {
          try {
            const normalized = (msg as string).replace(/:nan\b/g, ':null');
            msg = JSON.parse(normalized) as Record<string, unknown>;
          } catch {
            continue;
          }
        }
        if (!msg || typeof msg !== 'object') continue;
        const msgType = msg.type as string | undefined;
        const msgVersion = (msg.version as string) ?? '';
        const firmwareVersion = (msg.firmwareVersion as string) ?? '';

        if (msgType === 'firmware-update-done' && msgVersion === version) {
          return { status: 'done', version: msgVersion };
        }
        if (msgType === 'firmware-update-failed' && msgVersion === version) {
          const error = (msg.error as string) ?? 'Erreur inconnue';
          return { status: 'failed', error };
        }
        if (msgType === 'info' && firmwareVersion === version) {
          return { status: 'done', version: firmwareVersion };
        }
      }
      afterTimetoken = messages[0].timetoken;
    }
  }

  if (opts?.kidooId) {
    const actionVal = opts.action ?? 'firmware-update';
    console.log('[PUBNUB] Timeout firmware', 'action:', chalk.red(actionVal), 'kidooId:', chalk.red(opts.kidooId));
  }
  return null;
}

// Commandes disponibles
export const Commands = {
  /**
   * Change la luminosité d'un Kidoo
   */
  brightness: (macAddress: string, value: number): Promise<boolean> => {
    return sendCommand(macAddress, 'brightness', { params: { value } });
  },

  /**
   * Change le timeout de veille
   */
  sleepTimeout: (macAddress: string, value: number): Promise<boolean> => {
    return sendCommand(macAddress, 'sleep-timeout', { params: { value } });
  },

  /**
   * Redémarre un Kidoo
   */
  reboot: (macAddress: string, delayMs?: number): Promise<boolean> => {
    return sendCommand(macAddress, 'reboot', delayMs ? { params: { delay: delayMs } } : undefined);
  },

  /**
   * Lance une mise à jour firmware OTA vers une version cible
   */
  firmwareUpdate: (macAddress: string, version: string): Promise<boolean> => {
    return sendCommand(macAddress, KidooCommandAction.FirmwareUpdate, { params: { version } });
  },

  /**
   * Envoie une commande série brute
   */
  serial: (macAddress: string, command: string): Promise<boolean> => {
    return publishToKidoo(macAddress, command);
  },
} as const;
