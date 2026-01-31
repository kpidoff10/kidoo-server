/**
 * Route API pour tester la configuration de l'heure de réveil du modèle Dream
 * POST /api/kidoos/[id]/dream-wakeup-test - Démarre ou arrête le test
 */

import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';
import { sendCommand, isPubNubConfigured } from '@/lib/pubnub';
import { hexToRgb, saturateRgbToMax } from '@/shared';

/**
 * POST /api/kidoos/[id]/dream-wakeup-test
 * Démarre ou arrête le test de l'heure de réveil
 */
export const POST = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { userId } = request;
    const { id } = await params;

    // Récupérer et valider le body
    const body = await request.json();
    const { action } = body;

    if (action !== 'start' && action !== 'stop') {
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: 'L\'action doit être "start" ou "stop"',
        field: 'action',
      });
    }

    // Vérifier que le Kidoo existe et appartient à l'utilisateur
    const kidoo = await prisma.kidoo.findUnique({
      where: { id },
      include: {
        configDream: true,
      },
    });

    if (!kidoo) {
      return createErrorResponse('NOT_FOUND', 404, {
        message: 'Kidoo non trouvé',
      });
    }

    if (kidoo.userId !== userId) {
      return createErrorResponse('FORBIDDEN', 403, {
        message: 'Accès non autorisé',
      });
    }

    // Vérifier que c'est un modèle Dream
    if (kidoo.model !== 'DREAM') {
      return createErrorResponse('BAD_REQUEST', 400, {
        message: 'Cette fonctionnalité est uniquement disponible pour le modèle Dream',
      });
    }

    // Vérifier que le Kidoo a une adresse MAC
    if (!kidoo.macAddress) {
      return createErrorResponse('BAD_REQUEST', 400, {
        message: 'Kidoo non configuré (adresse MAC manquante)',
      });
    }

    // Vérifier PubNub
    if (!isPubNubConfigured()) {
      return createErrorResponse('SERVICE_UNAVAILABLE', 503, {
        message: 'Service PubNub non configuré',
      });
    }

    if (action === 'stop') {
      // Arrêter le test
      const sent = await sendCommand(kidoo.macAddress, 'stop-test-wakeup');
      
      if (!sent) {
        return createErrorResponse('INTERNAL_ERROR', 500, {
          message: 'Échec de l\'envoi de la commande d\'arrêt',
        });
      }

      return createSuccessResponse(
        { action: 'stop' },
        { message: 'Test arrêté' }
      );
    }

    // Action = 'start'
    // Récupérer les paramètres du test (couleur et luminosité uniquement)
    const { color, brightness } = body;

    console.log('[DREAM-WAKEUP-TEST] Paramètres reçus:', { color, brightness });

    // Si les paramètres ne sont pas fournis, utiliser la configuration sauvegardée
    let testColorR: number;
    let testColorG: number;
    let testColorB: number;
    let testBrightness: number;

    // Vérifier si les paramètres sont fournis (color doit être une string non vide)
    if (color && typeof color === 'string' && color.trim() !== '' && brightness !== undefined && brightness !== null) {
      // Utiliser les paramètres fournis
      // Convertir la couleur hex en RGB et saturer à 100% pour une couleur "profonde"
      const rgb = hexToRgb(color);
      if (!rgb) {
        console.error('[DREAM-WAKEUP-TEST] Couleur hex invalide:', color);
        return createErrorResponse('VALIDATION_ERROR', 400, {
          message: 'Couleur invalide',
          field: 'color',
        });
      }
      
      // Saturer la couleur à 100% pour qu'elle soit "profonde" (ex: jaune = 100% jaune)
      const saturatedRgb = saturateRgbToMax(rgb);
      testColorR = saturatedRgb.r;
      testColorG = saturatedRgb.g;
      testColorB = saturatedRgb.b;
      testBrightness = brightness;
      
      console.log('[DREAM-WAKEUP-TEST] Utilisation des paramètres fournis:', {
        colorHex: color,
        rgbOriginal: { r: rgb.r, g: rgb.g, b: rgb.b },
        rgbSature: { r: testColorR, g: testColorG, b: testColorB },
        brightness: testBrightness,
      });
    } else if (kidoo.configDream) {
      // Utiliser la configuration sauvegardée
      testColorR = kidoo.configDream.wakeupColorR ?? 255;
      testColorG = kidoo.configDream.wakeupColorG ?? 200;
      testColorB = kidoo.configDream.wakeupColorB ?? 100;
      testBrightness = kidoo.configDream.wakeupBrightness ?? 50;
      
      console.log('[DREAM-WAKEUP-TEST] Utilisation de la configuration sauvegardée:', {
        rgb: { r: testColorR, g: testColorG, b: testColorB },
        brightness: testBrightness,
      });
    } else {
      // Valeurs par défaut
      testColorR = 255;
      testColorG = 200;
      testColorB = 100;
      testBrightness = 50;
      
      console.log('[DREAM-WAKEUP-TEST] Utilisation des valeurs par défaut:', {
        rgb: { r: testColorR, g: testColorG, b: testColorB },
        brightness: testBrightness,
      });
    }

    // Valider les paramètres
    if (testColorR < 0 || testColorR > 255 || testColorG < 0 || testColorG > 255 || testColorB < 0 || testColorB > 255) {
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: 'Couleur invalide',
        field: 'color',
      });
    }

    if (testBrightness < 0 || testBrightness > 100) {
      return createErrorResponse('VALIDATION_ERROR', 400, {
        message: 'Brightness invalide (doit être entre 0 et 100)',
        field: 'brightness',
      });
    }

    // Envoyer la commande de démarrage du test
    console.log('[DREAM-WAKEUP-TEST] Envoi commande PubNub avec:', {
      colorR: testColorR,
      colorG: testColorG,
      colorB: testColorB,
      brightness: testBrightness,
    });
    
    const sent = await sendCommand(kidoo.macAddress, 'start-test-wakeup', {
      params: {
        colorR: testColorR,
        colorG: testColorG,
        colorB: testColorB,
        brightness: testBrightness,
      },
    });

    if (!sent) {
      return createErrorResponse('INTERNAL_ERROR', 500, {
        message: 'Échec de l\'envoi de la commande de test',
      });
    }

    return createSuccessResponse(
      {
        action: 'start',
        colorR: testColorR,
        colorG: testColorG,
        colorB: testColorB,
        brightness: testBrightness,
      },
      { message: 'Test démarré' }
    );
  } catch (error) {
    console.error('Erreur lors du test de l\'heure de réveil:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
