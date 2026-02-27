import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/jwt';

/**
 * POST /api/auth/mobile/push-token
 * Enregistrer ou mettre à jour le token Expo Push pour l'utilisateur connecté
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Token manquant' },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { pushToken } = body;

    if (!pushToken || typeof pushToken !== 'string') {
      return NextResponse.json(
        { error: 'pushToken requis (string)' },
        { status: 400 }
      );
    }

    // Expo push tokens commencent par ExponentPushToken[
    if (!pushToken.startsWith('ExponentPushToken[')) {
      return NextResponse.json(
        { error: 'Format de token invalide (Expo Push Token attendu)' },
        { status: 400 }
      );
    }

    await prisma.pushToken.upsert({
      where: { token: pushToken },
      create: {
        userId: payload.userId,
        token: pushToken,
      },
      update: {
        userId: payload.userId,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du push token:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/mobile/push-token
 * Supprimer le token Expo Push pour l'utilisateur connecté
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Token manquant' },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { pushToken } = body;

    if (pushToken && typeof pushToken === 'string') {
      await prisma.pushToken.deleteMany({
        where: {
          userId: payload.userId,
          token: pushToken,
        },
      });
    } else {
      // Supprimer tous les tokens de l'utilisateur
      await prisma.pushToken.deleteMany({
        where: { userId: payload.userId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression du push token:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
