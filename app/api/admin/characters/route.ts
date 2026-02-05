/**
 * GET /api/admin/characters - List all characters
 * POST /api/admin/characters - Create a character (admin only)
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { CharacterErrors } from './errors';
import { createCharacterSchema } from '@kidoo/shared';

export const GET = withAdminAuth(async (_request: AdminAuthenticatedRequest) => {
  try {
    const characters = await prisma.character.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const withISO = characters.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return createSuccessResponse(withISO, {
      message: `${withISO.length} personnage(s) trouvé(s)`,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des personnages:', error);
    return createErrorResponse(CharacterErrors.INTERNAL_ERROR, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

export const POST = withAdminAuth(async (request: AdminAuthenticatedRequest) => {
  try {
    const body = await request.json();
    const parsed = createCharacterSchema.safeParse({
      ...body,
      defaultImageUrl: body.defaultImageUrl === '' ? null : body.defaultImageUrl,
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return createErrorResponse(CharacterErrors.VALIDATION_ERROR, {
        message: first.message,
        field: String(first.path[0]),
      });
    }

    const { name, defaultImageUrl, sex, personality } = parsed.data;

    const character = await prisma.character.create({
      data: {
        name: name ?? null,
        defaultImageUrl: defaultImageUrl ?? null,
        sex,
        personality,
      },
    });

    return createSuccessResponse(
      {
        ...character,
        createdAt: character.createdAt.toISOString(),
        updatedAt: character.updatedAt.toISOString(),
      },
      { message: 'Personnage créé', status: 201 }
    );
  } catch (error) {
    console.error('Erreur lors de la création du personnage:', error);
    return createErrorResponse(CharacterErrors.INTERNAL_ERROR, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
