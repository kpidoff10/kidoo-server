import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { PostErrors } from '../errors';

/**
 * GET /api/admin/posts/[id]
 * Récupère un post spécifique
 */
export const GET = withAdminAuth(async (request: AdminAuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: params.id },
    });

    if (!post) {
      return createErrorResponse(PostErrors.NOT_FOUND);
    }

    return createSuccessResponse(post);
  } catch (error) {
    console.error('Erreur lors de la récupération du post:', error);
    return createErrorResponse(PostErrors.INTERNAL_ERROR);
  }
});

/**
 * PATCH /api/admin/posts/[id]
 * Met à jour un post
 */
export const PATCH = withAdminAuth(async (request: AdminAuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: params.id },
    });

    if (!post) {
      return createErrorResponse(PostErrors.NOT_FOUND);
    }

    const body = await request.json();
    const { title, excerpt, content, imageUrl, type, published } = body;

    const updated = await prisma.post.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(excerpt !== undefined && { excerpt }),
        ...(content !== undefined && { content }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(type !== undefined && { type }),
        ...(published !== undefined && {
          published,
          publishedAt: published ? new Date() : null,
        }),
      },
    });

    return createSuccessResponse(updated);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du post:', error);
    return createErrorResponse(PostErrors.INTERNAL_ERROR);
  }
});

/**
 * DELETE /api/admin/posts/[id]
 * Supprime un post
 */
export const DELETE = withAdminAuth(async (request: AdminAuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: params.id },
    });

    if (!post) {
      return createErrorResponse(PostErrors.NOT_FOUND);
    }

    await prisma.post.delete({
      where: { id: params.id },
    });

    return createSuccessResponse({ id: params.id });
  } catch (error) {
    console.error('Erreur lors de la suppression du post:', error);
    return createErrorResponse(PostErrors.INTERNAL_ERROR);
  }
});
