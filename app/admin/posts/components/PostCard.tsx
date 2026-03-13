'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Post } from '../../lib/postsApi';

export interface PostCardProps {
  post: Post;
  onDelete: (id: string) => Promise<void>;
}

const TYPE_COLORS: Record<string, { badge: string; dot: string }> = {
  news: { badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
  update: { badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  promo: { badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  feature: { badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
};

const TYPE_LABELS: Record<string, string> = {
  news: 'Actualité',
  update: 'Mise à jour',
  promo: 'Promotion',
  feature: 'Nouveauté',
};

export function PostCard({ post, onDelete }: PostCardProps) {
  const colors = TYPE_COLORS[post.type] || TYPE_COLORS.news;
  const typeLabel = TYPE_LABELS[post.type] || post.type;

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <div className="aspect-video w-full shrink-0 bg-muted">
        {post.imageUrl ? (
          <Image
            src={post.imageUrl}
            alt={post.title}
            width={400}
            height={225}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
            Pas d'image
          </div>
        )}
      </div>

      <CardHeader className="flex-grow pb-3">
        <div className="flex items-start justify-between gap-2">
          <span className={cn('inline-block rounded-full px-2 py-1 text-xs font-medium', colors.badge)}>
            {typeLabel}
          </span>
          {post.published ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
              ✓ Publié
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
              📝 Brouillon
            </span>
          )}
        </div>
        <CardTitle className="line-clamp-2 text-base mt-3">{post.title}</CardTitle>
        {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{post.excerpt}</p>}
      </CardHeader>

      <div className="flex gap-2 border-t p-3">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href={`/admin/posts/${post.id}`}>Éditer</Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-destructive hover:text-destructive"
          onClick={() => onDelete(post.id)}
        >
          Supprimer
        </Button>
      </div>
    </Card>
  );
}
