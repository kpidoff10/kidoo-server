/**
 * Logique partagée pour l'alerte veilleuse (GET et POST).
 */

import { prisma } from '@/lib/prisma';
import { sendPushToUser } from '@/lib/expo-push';

export function normalizeMac(mac: string): string {
  return mac.replace(/[:.\-]/g, '').toUpperCase();
}

export async function processNighttimeAlert(mac: string): Promise<{
  ok: boolean;
  pushed?: number;
  reason?: string;
  error?: string;
  status: number;
}> {
  const macSuffix = normalizeMac(mac);

  if (!macSuffix || macSuffix.length < 12) {
    return { ok: false, error: 'MAC manquante', status: 400 };
  }

  const kidoos = await prisma.kidoo.findMany({
    where: {
      macAddress: { not: null },
      model: 'dream',
      userId: { not: null },
    },
    include: { configDream: true },
  });

  const kidoo = kidoos.find((k) => {
    if (!k.macAddress) return false;
    return normalizeMac(k.macAddress) === macSuffix;
  });

  if (!kidoo?.userId || !kidoo.configDream?.nighttimeAlertEnabled) {
    return { ok: false, pushed: 0, reason: 'kidoo_not_found_or_disabled', status: 200 };
  }

  // Créer une notification en DB
  // Titre et message seront gérés par l'app via useTranslation()
  // Kidoo name est accessible via la FK kidooId → Kidoo.name
  await prisma.notification.create({
    data: {
      userId: kidoo.userId,
      kidooId: kidoo.id,
      type: 'nighttime-alert',
    },
  });

  // Envoyer la notification push
  // Le titre et message sont ici pour le push, mais stockés en DB via le type
  const sent = await sendPushToUser(
    kidoo.userId,
    'Alerte veilleuse',
    `${kidoo.name || 'Votre veilleuse'} : votre enfant a touché la veilleuse.`,
    { type: 'nighttime-alert', kidooId: kidoo.id, kidooName: kidoo.name },
    { channelId: 'nighttime-alert', priority: 'high', categoryId: 'nighttime-alert' }
  );

  return { ok: true, pushed: sent, status: 200 };
}
