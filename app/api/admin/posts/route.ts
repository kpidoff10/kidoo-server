import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { PostErrors } from './errors';

/**
 * GET /api/admin/posts
 * Liste tous les posts (admin)
 */
export const GET = withAdminAuth(async (request: AdminAuthenticatedRequest) => {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const published = url.searchParams.get('published');

    const where: any = {};
    if (type) where.type = type;
    if (published !== null) where.published = published === 'true';

    const posts = await prisma.post.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
    });

    return createSuccessResponse(posts);
  } catch (error) {
    console.error('Erreur lors de la récupération des posts:', error);
    return createErrorResponse(PostErrors.INTERNAL_ERROR);
  }
});

/**
 * POST /api/admin/posts
 * Crée un nouveau post
 */
export const POST = withAdminAuth(async (request: AdminAuthenticatedRequest) => {
  try {
    const body = await request.json();
    const { title, excerpt, content, imageUrl, type = 'news', published } = body;

    if (!title || !content) {
      return createErrorResponse(PostErrors.VALIDATION_ERROR);
    }

    const post = await prisma.post.create({
      data: {
        title,
        excerpt: excerpt || null,
        content,
        imageUrl: imageUrl || null,
        type,
        published: published ?? false,
        publishedAt: published ? new Date() : null,
      },
    });

    return createSuccessResponse(post, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création du post:', error);
    return createErrorResponse(PostErrors.INTERNAL_ERROR);
  }
});
