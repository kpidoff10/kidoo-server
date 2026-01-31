import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
// Import depuis shared/ (fonctionne avec Webpack, utilise @/lib/shared avec Turbopack)
import { registerSchema, emailSchema } from '@/shared';

/**
 * POST /api/auth/register
 * Crée un nouveau compte utilisateur
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation des données
    const validationResult = registerSchema.safeParse(body);

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

    const { email, password, name } = validationResult.data;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Un compte avec cet email existe déjà',
          field: 'email',
        },
        { status: 409 }
      );
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Compte créé avec succès',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erreur lors de la création du compte:', error);

    // Gérer les erreurs Prisma spécifiques
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Un compte avec cet email existe déjà',
            field: 'email',
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Une erreur est survenue lors de la création du compte. Veuillez réessayer.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/register/check-email?email=...
 * Vérifie si un email est déjà utilisé
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Paramètre email requis',
        },
        { status: 400 }
      );
    }

    // Validation de l'email
    const validationResult = emailSchema.safeParse(email);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email invalide',
        },
        { status: 400 }
      );
    }

    // Vérifier si l'email existe
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      available: !user,
      message: user ? 'Cet email est déjà utilisé' : 'Cet email est disponible',
    });
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'email:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Une erreur est survenue lors de la vérification',
      },
      { status: 500 }
    );
  }
}
