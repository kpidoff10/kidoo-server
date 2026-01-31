'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { registerSchema, type RegisterInput } from '@/shared';

export type RegisterResult = 
  | { success: true; userId: string; message: string }
  | { success: false; error: string; field?: string };

/**
 * Crée un nouveau compte utilisateur
 * @param data - Données d'inscription (email, password, name)
 * @returns Résultat de l'inscription avec succès ou erreur
 */
export async function registerUser(data: RegisterInput): Promise<RegisterResult> {
  try {
    // Validation des données
    const validationResult = registerSchema.safeParse(data);
    
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return {
        success: false,
        error: firstError.message,
        field: firstError.path[0] as string,
      };
    }

    const { email, password, name } = validationResult.data;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'Un compte avec cet email existe déjà',
        field: 'email',
      };
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
      },
    });

    // Revalider les caches si nécessaire
    revalidatePath('/');

    return {
      success: true,
      userId: user.id,
      message: 'Compte créé avec succès',
    };
  } catch (error) {
    console.error('Erreur lors de la création du compte:', error);
    
    // Gérer les erreurs Prisma spécifiques
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return {
          success: false,
          error: 'Un compte avec cet email existe déjà',
          field: 'email',
        };
      }
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la création du compte. Veuillez réessayer.',
    };
  }
}

/**
 * Vérifie si un email est déjà utilisé
 * @param email - Email à vérifier
 * @returns true si l'email est disponible, false sinon
 */
export async function checkEmailAvailability(email: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return !user;
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'email:', error);
    return false;
  }
}
