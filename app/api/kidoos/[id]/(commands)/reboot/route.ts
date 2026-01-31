/**
 * Route API pour redémarrer un Kidoo
 * POST /api/kidoos/[id]/commands/reboot
 * 
 * Body: { "delay": 1000 } (optionnel, en ms)
 * 
 * Modèles autorisés: tous
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { sendCommand, isPubNubConfigured } from '@/lib/pubnub';
import { rebootCommandSchema } from '@/shared';

/**
 * POST /api/kidoos/[id]/commands/reboot
 * Redémarre un Kidoo
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification
    const authResult = requireAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { userId } = authResult;
    const { id } = await params;

    // Récupérer et valider le body (peut être vide)
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body vide ou invalide, on continue avec les valeurs par défaut
    }
    
    const validation = rebootCommandSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Le délai doit être un nombre positif (optionnel)',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { delay } = validation.data;

    // Vérifier que le Kidoo existe et appartient à l'utilisateur
    const kidoo = await prisma.kidoo.findUnique({
      where: { id },
    });

    if (!kidoo) {
      return NextResponse.json(
        { success: false, error: 'Kidoo non trouvé' },
        { status: 404 }
      );
    }

    if (kidoo.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // Vérifier que le Kidoo a une adresse MAC
    if (!kidoo.macAddress) {
      return NextResponse.json(
        { success: false, error: 'Kidoo non configuré (adresse MAC manquante)' },
        { status: 400 }
      );
    }

    // Vérifier PubNub
    if (!isPubNubConfigured()) {
      return NextResponse.json(
        { success: false, error: 'PubNub non configuré sur le serveur' },
        { status: 503 }
      );
    }

    // Envoyer la commande via PubNub
    const commandParams = delay ? { delay } : undefined;
    const sent = await sendCommand(kidoo.macAddress, 'reboot', commandParams);

    if (!sent) {
      return NextResponse.json(
        { success: false, error: 'Échec de l\'envoi de la commande au Kidoo' },
        { status: 502 }
      );
    }

    const message = delay 
      ? `Redémarrage dans ${delay}ms` 
      : 'Redémarrage en cours';

    return NextResponse.json({
      success: true,
      data: { delay: delay || 0 },
      message,
    });
  } catch (error) {
    console.error('Erreur lors du redémarrage:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

    return NextResponse.json(
      {
        success: false,
        error: 'Une erreur est survenue',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
