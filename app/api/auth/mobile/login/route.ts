import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { loginSchema } from '@/shared';
import { generateTokens } from '@/lib/jwt';

/**
 * POST /api/auth/mobile/login
 * Authentification mobile avec JWT tokens
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation des données
    const validationResult = loginSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: firstError.message,
          field: firstError.path[0],
        },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Rechercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email ou mot de passe incorrect',
          field: 'credentials',
        },
        { status: 401 }
      );
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email ou mot de passe incorrect',
          field: 'credentials',
        },
        { status: 401 }
      );
    }

    // Générer les tokens JWT
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
    });

    // Retourner les informations utilisateur avec les tokens
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name || '',
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Une erreur est survenue lors de la connexion',
      },
      { status: 500 }
    );
  }
}
