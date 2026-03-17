import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRefreshToken, generateTokens } from '@/lib/jwt';

/**
 * POST /api/auth/mobile/refresh
 * Rafraîchir les tokens JWT
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    console.log('[Refresh] Token provided:', !!refreshToken);

    if (!refreshToken) {
      console.error('[Refresh] Refresh token manquant');
      return NextResponse.json(
        { error: 'Refresh token manquant' },
        { status: 400 }
      );
    }

    // Vérifier le refresh token
    const payload = verifyRefreshToken(refreshToken);
    console.log('[Refresh] Verify result:', payload ? 'Valid - userId: ' + payload.userId : 'Invalid');

    if (!payload) {
      console.error('[Refresh] Refresh token invalide ou expiré');
      return NextResponse.json(
        { error: 'Refresh token invalide ou expiré' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur existe toujours
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 401 }
      );
    }

    // Générer de nouveaux tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    console.error('Erreur lors du refresh:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
