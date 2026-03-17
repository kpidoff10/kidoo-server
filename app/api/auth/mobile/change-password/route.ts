import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { changePasswordSchema } from '@/shared';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { ChangePasswordErrors } from './errors';

/**
 * POST /api/auth/mobile/change-password
 * Changer le mot de passe de l'utilisateur connecté
 */
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { userId } = request;
    const body = await request.json();

    // Validation des données
    const validationResult = changePasswordSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return createErrorResponse(ChangePasswordErrors.VALIDATION_ERROR, {
        message: firstError.message,
        field: firstError.path[0] as string,
      });
    }

    const { currentPassword, newPassword } = validationResult.data;

    // Récupérer l'utilisateur avec son mot de passe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      return createErrorResponse(ChangePasswordErrors.USER_NOT_FOUND);
    }

    if (!user.password) {
      return createErrorResponse(ChangePasswordErrors.NO_PASSWORD_SET, {
        message: 'Aucun mot de passe configuré pour ce compte. Utilisez la connexion sociale ou réinitialisez votre mot de passe.',
        field: 'currentPassword',
      });
    }

    // Vérifier le mot de passe actuel
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      // Utiliser 400 au lieu de 401 pour éviter que l'interceptor Axios ne tente un refresh token
      // Le 401 est réservé aux erreurs d'authentification (token expiré/invalide)
      return createErrorResponse(ChangePasswordErrors.PASSWORD_INCORRECT, {
        field: 'currentPassword',
      });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    return createSuccessResponse(null, {
      message: 'Mot de passe modifié avec succès',
    });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    return createErrorResponse(ChangePasswordErrors.INTERNAL_ERROR, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
