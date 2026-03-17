/**
 * Route API pour lancer une mise à jour firmware sur un Kidoo
 * POST /api/kidoos/[id]/firmware-update
 * (Le dossier (commands) est un route group Next.js → n'apparaît pas dans l'URL)
 *
 * Body: { "version": "1.0.1" }
 *
 * Valide la requête et retourne success. L'app envoie la commande MQTT directement au device.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { firmwareUpdateCommandSchema } from '@/shared';

/**
 * POST /api/kidoos/[id]/firmware-update
 * Envoie la commande OTA puis attend la réponse de l'ESP (done/failed).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { userId } = authResult;
    const { id } = await params;

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body vide ou invalide
    }

    const validation = firmwareUpdateCommandSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'La version est requise',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { version } = validation.data;

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

    if (!kidoo.macAddress) {
      return NextResponse.json(
        { success: false, error: 'Kidoo non configuré (adresse MAC manquante)' },
        { status: 400 }
      );
    }

    // Validation OK - l'app enverra la commande MQTT directement
    console.log(`Firmware update request validated for kidoo ${id} (version ${version})`);

    return NextResponse.json({
      success: true,
      message: 'Commande firmware prête à être envoyée par l\'app',
    });
  } catch (error) {
    console.error('Erreur lors du lancement de la mise à jour firmware:', error);
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
