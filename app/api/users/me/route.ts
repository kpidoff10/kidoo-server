import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { prisma } from '@/lib/prisma';
import { sendCommand, isPubNubConfigured } from '@/lib/pubnub';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';

const VALID_TIMEZONES = [
  'UTC', 'Europe/Paris', 'Europe/London', 'Europe/Berlin', 'Europe/Amsterdam',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore', 'Asia/Bangkok',
  'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland',
  'America/Toronto', 'America/Mexico_City', 'America/Sao_Paulo',
  'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos',
  'India/Kolkata', 'Asia/Dubai', 'Asia/Istanbul'
];

/**
 * PATCH /api/users/me
 * Met à jour le profil de l'utilisateur connecté
 */
export const PATCH = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { userId } = request;
    const body = await request.json();
    const { name, avatar, timezoneId } = body;

    // Construire les données à mettre à jour
    const updateData: { name?: string; avatar?: string; timezoneId?: string } = {};
    if (name !== undefined) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (timezoneId !== undefined) {
      if (!VALID_TIMEZONES.includes(timezoneId)) {
        return createErrorResponse('VALIDATION_ERROR', 400, {
          message: 'Timezone invalide',
          field: 'timezoneId',
        });
      }
      updateData.timezoneId = timezoneId;
    }

    if (Object.keys(updateData).length === 0) {
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: 'Aucune donnée à mettre à jour',
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        timezoneId: true,
      },
    });

    // Si le timezone a changé, envoyer une commande PubNub à tous les appareils de l'utilisateur
    if (timezoneId && isPubNubConfigured()) {
      try {
        const kidoos = await prisma.kidoo.findMany({
          where: { userId },
          select: { macAddress: true },
        });

        for (const kidoo of kidoos) {
          if (kidoo.macAddress) {
            await sendCommand(kidoo.macAddress, 'set-timezone', {
              params: { timezoneId },
            });
          }
        }
      } catch (error) {
        console.error('Erreur lors de l\'envoi de la commande set-timezone via PubNub:', error);
        // Ne pas échouer la requête si PubNub échoue
      }
    }

    return createSuccessResponse(user, { message: 'Profil mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      message: 'Erreur lors de la mise à jour du profil',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
