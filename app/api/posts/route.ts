import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

/**
 * GET /api/posts
 * Liste les posts publiés (API publique pour l'app mobile)
 * Query params: limit, type
 */
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '10'), 50);
    const type = url.searchParams.get('type');

    const where: any = {
      published: true,
    };
    if (type) where.type = type;

    const posts = await prisma.post.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });

    return createSuccessResponse(posts);
  } catch (error) {
    console.error('Erreur lors de la récupération des posts:', error);
    return NextResponse.json(
      { success: false, error: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
});
