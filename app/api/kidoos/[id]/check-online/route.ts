/**
 * Route API pour vérifier si un Kidoo est en ligne
 * GET /api/kidoos/[id]/check-online
 * 
 * Cette route:
 * 1. Envoie une commande get-info à l'ESP32 via PubNub
 * 2. Attend la réponse via l'API History de PubNub (timeout 3s)
 * 3. Met à jour isConnected et lastConnected en base
 * 4. Retourne true si une réponse est reçue, false sinon
 */

import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { KidooCommandAction } from '@kidoo/shared';
import { sendCommand, isPubNubConfigured, waitForMessage } from '@/lib/pubnub';
import { KidooErrors } from '../errors';

// Timeout pour attendre la réponse de l'ESP32 (en ms)
const RESPONSE_TIMEOUT_MS = 5000;

/**
 * GET /api/kidoos/[id]/check-online
 * Vérifie si un Kidoo est en ligne en envoyant une commande get-info
 */
export const GET = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { userId } = request;
    const { id } = await params;

    // Vérifier que le Kidoo existe et appartient à l'utilisateur
    const kidoo = await prisma.kidoo.findUnique({
      where: { id },
    });

    if (!kidoo) {
      return createErrorResponse(KidooErrors.NOT_FOUND);
    }

    if (kidoo.userId !== userId) {
      return createErrorResponse(KidooErrors.NOT_OWNED);
    }

    // Vérifier que le Kidoo a une adresse MAC
    if (!kidoo.macAddress) {
      return createErrorResponse(KidooErrors.NOT_FOUND, {
        message: 'Kidoo non configuré (adresse MAC manquante)',
      });
    }

    // Vérifier PubNub
    if (!isPubNubConfigured()) {
      // PubNub non configuré, considérer comme hors ligne
      await prisma.kidoo.update({
        where: { id },
        data: {
          isConnected: false,
        },
      });
      return createSuccessResponse(
        { isOnline: false, reason: 'PubNub non configuré' },
        { message: 'Kidoo hors ligne (PubNub non configuré)' }
      );
    }

    const sent = await sendCommand(kidoo.macAddress, 'get-info', { kidooId: id });

    if (!sent) {
      // Échec d'envoi, considérer comme hors ligne
      await prisma.kidoo.update({
        where: { id },
        data: {
          isConnected: false,
        },
      });
      return createSuccessResponse(
        { isOnline: false, reason: 'Échec de l\'envoi de la commande' },
        { message: 'Kidoo hors ligne' }
      );
    }

    const response = await waitForMessage(kidoo.macAddress, 'info', {
      timeoutMs: RESPONSE_TIMEOUT_MS,
      pollIntervalMs: 500,
      kidooId: id,
      action: KidooCommandAction.GetInfo,
    });
    
    // Si pas de réponse et que l'adresse MAC pourrait être incorrecte, 
    // on essaie de chercher sur tous les channels récents (fallback)
    // (Cette logique sera améliorée si nécessaire)

    if (response) {
      
      // Mettre à jour l'adresse MAC si elle est différente (corriger les erreurs d'enregistrement)
      const updateData: { isConnected: boolean; lastConnected: Date; macAddress?: string } = {
        isConnected: true,
        lastConnected: new Date(),
      };
      
      if (response.mac && typeof response.mac === 'string') {
        // Nettoyer l'adresse MAC (enlever les : et -)
        const cleanMac = response.mac.replace(/[:-]/g, '').toUpperCase();
        const currentMac = kidoo.macAddress?.replace(/[:-]/g, '').toUpperCase();
        
        if (currentMac !== cleanMac) {
          console.log(`[CHECK-ONLINE] Mise à jour de l'adresse MAC: ${kidoo.macAddress} -> ${response.mac}`);
          updateData.macAddress = response.mac;
        }
      }
      
      // Mettre à jour la base de données
      await prisma.kidoo.update({
        where: { id },
        data: updateData,
      });

      // Retourner deviceState si présent (Dream: idle, bedtime, wakeup)
      const deviceState =
        typeof response.deviceState === 'string' &&
        ['idle', 'bedtime', 'wakeup'].includes(response.deviceState)
          ? response.deviceState
          : undefined;

      return createSuccessResponse(
        { isOnline: true, ...(deviceState && { deviceState }) },
        { message: 'Kidoo en ligne' }
      );
    }

    // Timeout - Kidoo hors ligne
    await prisma.kidoo.update({
      where: { id },
      data: {
        isConnected: false,
      },
    });

    return createSuccessResponse(
      { isOnline: false, reason: 'Timeout - aucune réponse reçue' },
      { message: 'Kidoo hors ligne' }
    );

  } catch (error) {
    console.error('Erreur lors de la vérification du statut en ligne:', error);
    return createErrorResponse(KidooErrors.INTERNAL_ERROR, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
