/**
 * Service Expo Push pour envoyer des notifications aux appareils mobiles.
 * Utilise l'API Expo Push (https://exp.host/--/api/v2/push/send).
 */

import { prisma } from '@/lib/prisma';

export interface ExpoPushMessage {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  channelId?: string;
  /** 'high' = livraison immédiate même écran verrouillé (évite Doze Android) */
  priority?: 'default' | 'normal' | 'high';
  /** Catégorie pour boutons d'action (ex: 'nighttime-alert' avec bouton "J'arrive") */
  categoryId?: string;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface SendPushOptions {
  /** Android: canal de notification (ex: 'default', 'nighttime-alert') */
  channelId?: string;
  /** Priorité haute pour livraison immédiate (écran verrouillé, Doze) */
  priority?: 'default' | 'normal' | 'high';
  /** Catégorie pour boutons d'action (doit correspondre à setNotificationCategoryAsync côté app) */
  categoryId?: string;
}

/**
 * Envoie une notification Expo Push à un utilisateur (tous ses appareils enregistrés).
 * @param userId ID de l'utilisateur
 * @param title Titre de la notification
 * @param body Corps du message
 * @param data Données additionnelles (ex: kidooId, type)
 * @param options Options (channelId pour Android)
 * @returns Nombre de notifications envoyées
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
  options?: SendPushOptions
): Promise<number> {
  const tokens = await prisma.pushToken.findMany({
    where: { userId },
    select: { token: true },
  });

  if (tokens.length === 0) {
    return 0;
  }

  const messages: ExpoPushMessage[] = tokens.map(({ token }) => ({
    to: token,
    title,
    body,
    data: data ?? {},
    sound: 'default',
    ...(options?.channelId && { channelId: options.channelId }),
    ...(options?.priority && { priority: options.priority }),
    ...(options?.categoryId && { categoryId: options.categoryId }),
  }));

  const sent = await sendPushNotifications(messages);
  return sent;
}

/**
 * Envoie des notifications via l'API Expo Push.
 * Gère le chunking (max 100 par requête) et les erreurs.
 */
export async function sendPushNotifications(
  messages: ExpoPushMessage[]
): Promise<number> {
  if (messages.length === 0) return 0;

  let sent = 0;
  const chunkSize = 100;

  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        console.error('[EXPO-PUSH] Erreur:', response.status, await response.text());
        continue;
      }

      const result = await response.json();
      if (result.data) {
        for (const receipt of result.data) {
          if (receipt.status === 'ok') sent++;
          else {
            console.warn('[EXPO-PUSH] Receipt erreur:', receipt.message, receipt.details);
          }
        }
      }
    } catch (error) {
      console.error('[EXPO-PUSH] Erreur envoi:', error);
    }
  }

  return sent;
}
