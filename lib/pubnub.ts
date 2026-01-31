/**
 * Service PubNub pour publier des commandes aux devices Kidoo (ESP32)
 * 
 * Chaque Kidoo écoute sur un channel unique basé sur son adresse MAC:
 * - Channel format: kidoo-{MAC_ADDRESS} (ex: kidoo-AABBCCDDEEFF)
 * 
 * @example
 * import { publishToKidoo } from '@/lib/pubnub';
 * 
 * // Envoyer une commande
 * await publishToKidoo('AABBCCDDEEFF', { action: 'brightness', value: 80 });
 */

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
  console.log(`[PUBNUB] Tentative de publication sur channel: ${channel}`);
  console.log(`[PUBNUB] Message:`, message);
  console.log(`[PUBNUB] PUBLISH_KEY configurée: ${PUBNUB_PUBLISH_KEY ? 'Oui (' + PUBNUB_PUBLISH_KEY.substring(0, 10) + '...)' : 'Non'}`);
  console.log(`[PUBNUB] SUBSCRIBE_KEY configurée: ${PUBNUB_SUBSCRIBE_KEY ? 'Oui (' + PUBNUB_SUBSCRIBE_KEY.substring(0, 10) + '...)' : 'Non'}`);

  if (!isPubNubConfigured()) {
    console.warn('[PUBNUB] PubNub non configuré (clés manquantes)');
    return false;
  }

  try {
    // Convertir le message en JSON si c'est un objet
    const messageStr = typeof message === 'string' 
      ? message 
      : JSON.stringify(message);
    
    const encodedMessage = encodeMessage(messageStr);
    
    // Construire l'URL de publication
    const url = `https://${PUBNUB_ORIGIN}/publish/${PUBNUB_PUBLISH_KEY}/${PUBNUB_SUBSCRIBE_KEY}/0/${channel}/0/${encodedMessage}`;
    
    console.log(`[PUBNUB] URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log(`[PUBNUB] Réponse (${response.status}): ${responseText}`);

    if (response.ok) {
      console.log(`[PUBNUB] Message publié sur ${channel}`);
      return true;
    } else {
      console.error(`[PUBNUB] Erreur publication: ${response.status} - ${responseText}`);
      return false;
    }
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
  console.log(`[PUBNUB] Publication sur channel: ${channel}`);
  console.log(`[PUBNUB] MAC address reçue: ${macAddress}`);
  const result = await publishToChannel(channel, message);
  if (result) {
    console.log(`[PUBNUB] Message publié avec succès sur ${channel}`);
  } else {
    console.error(`[PUBNUB] Échec de la publication sur ${channel}`);
  }
  return result;
}

/**
 * Envoie une commande à un Kidoo
 * @param macAddress L'adresse MAC du Kidoo
 * @param action Le nom de l'action (ex: 'brightness', 'reboot')
 * @param params Les paramètres de l'action
 * @returns true si la publication réussit
 */
export async function sendCommand(
  macAddress: string,
  action: string,
  params?: Record<string, unknown>
): Promise<boolean> {
  const message = {
    action,
    ...params,
    timestamp: Date.now(),
  };
  
  const channel = getKidooChannel(macAddress);
  console.log(`[PUBNUB] Envoi commande "${action}" sur channel: ${channel}`);
  console.log(`[PUBNUB] MAC address reçue: ${macAddress}`);
  console.log(`[PUBNUB] Message:`, JSON.stringify(message));
  
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
    // API History de PubNub avec include_token pour avoir les timetokens
    // Note: "start" = timetoken le plus récent (exclusif), "end" = timetoken le plus ancien (exclusif)
    // Pour récupérer les messages APRÈS un timetoken, on utilise "end" comme borne inférieure
    let url = `https://${PUBNUB_ORIGIN}/v2/history/sub-key/${PUBNUB_SUBSCRIBE_KEY}/channel/${channel}?count=${count}&include_token=true`;
    
    // Si on a un timetoken, ne récupérer que les messages APRÈS celui-ci
    if (afterTimetoken) {
      url += `&end=${afterTimetoken}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[PUBNUB] Erreur history: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    console.log(`[PUBNUB] History raw response:`, JSON.stringify(data, null, 2));
    
    // Format de réponse PubNub History avec include_token:
    // [[{message: {...}, timetoken: "..."}, ...], startTimetoken, endTimetoken]
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const messages = data[0] as { message: Record<string, unknown>; timetoken: string }[];
      console.log(`[PUBNUB] Parsed ${messages.length} messages from history`);
      return messages;
    }
    
    console.log(`[PUBNUB] Unexpected history format`);
    return null;
  } catch (error) {
    console.error('[PUBNUB] Erreur lors de la récupération de l\'historique:', error);
    return null;
  }
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

/**
 * Attend un message de type spécifique sur un channel avec timeout
 * @param macAddress L'adresse MAC du Kidoo
 * @param messageType Le type de message attendu (ex: 'info')
 * @param timeoutMs Timeout en millisecondes (défaut: 5000)
 * @param pollIntervalMs Intervalle de polling (défaut: 500)
 * @returns Le message trouvé ou null si timeout
 */
export async function waitForMessage(
  macAddress: string,
  messageType: string,
  timeoutMs: number = 5000,
  pollIntervalMs: number = 500
): Promise<Record<string, unknown> | null> {
  const startTime = Date.now();
  const channel = getKidooChannel(macAddress);
  
  // Récupérer le dernier timetoken pour ne chercher que les NOUVEAUX messages
  const initialHistory = await fetchHistory(channel, 1);
  let afterTimetoken: string | undefined;
  
  if (initialHistory && initialHistory.length > 0) {
    // Utiliser le timetoken du dernier message comme point de départ
    // Les messages sont retournés du plus ancien au plus récent, donc [0] est le plus récent quand count=1
    afterTimetoken = initialHistory[0].timetoken;
    console.log(`[PUBNUB] Timetoken de départ: ${afterTimetoken}`);
  }
  
  while (Date.now() - startTime < timeoutMs) {
    // Attendre avant de poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    
    // Récupérer les messages APRÈS le timetoken de départ
    const messages = await fetchHistory(channel, 10, afterTimetoken);
    
    if (messages && messages.length > 0) {
      console.log(`[PUBNUB] ${messages.length} nouveau(x) message(s) trouvé(s)`);
      
      // Les messages sont retournés du plus ancien au plus récent
      // On cherche le DERNIER message du type attendu (le plus récent)
      for (let i = messages.length - 1; i >= 0; i--) {
        const item = messages[i];
        const msg = item.message;
        if (msg && typeof msg === 'object' && msg.type === messageType) {
          console.log(`[PUBNUB] Message '${messageType}' trouvé (timetoken: ${item.timetoken})`);
          return msg;
        }
      }
      
      // Mettre à jour le timetoken pour la prochaine itération
      // Le dernier message de la liste est le plus récent
      afterTimetoken = messages[messages.length - 1].timetoken;
    }
  }
  
  console.log(`[PUBNUB] Timeout après ${timeoutMs}ms`);
  return null; // Timeout
}

// Commandes disponibles
export const Commands = {
  /**
   * Change la luminosité d'un Kidoo
   */
  brightness: (macAddress: string, value: number): Promise<boolean> => {
    return sendCommand(macAddress, 'brightness', { value });
  },

  /**
   * Change le timeout de veille
   */
  sleepTimeout: (macAddress: string, value: number): Promise<boolean> => {
    return sendCommand(macAddress, 'sleep-timeout', { value });
  },

  /**
   * Redémarre un Kidoo
   */
  reboot: (macAddress: string, delayMs?: number): Promise<boolean> => {
    return sendCommand(macAddress, 'reboot', delayMs ? { delay: delayMs } : undefined);
  },

  /**
   * Envoie une commande série brute
   */
  serial: (macAddress: string, command: string): Promise<boolean> => {
    return publishToKidoo(macAddress, command);
  },
} as const;
