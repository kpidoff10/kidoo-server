'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePosts, useDeletePost } from '@/app/admin/hooks/usePosts';
import { Post } from '@/app/admin/lib/postsApi';

const typeColors: Record<Post['type'], string> = {
  update: 'bg-blue-100 text-blue-800',
  promo: 'bg-orange-100 text-orange-800',
  feature: 'bg-green-100 text-green-800',
  news: 'bg-gray-100 text-gray-800',
};

const typeLabels: Record<Post['type'], string> = {
  update: 'Mise à jour',
  promo: 'Promotion',
  feature: 'Nouveauté',
  news: 'Actualité',
};

export default function PostsPage() {
  const { data: posts, isLoading, error } = usePosts();
  const deletePost = useDeletePost();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce post ?')) {
      setDeletingId(id);
      try {
        await deletePost.mutateAsync(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">Erreur lors du chargement des posts</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Actualités</h1>
          <p className="mt-2 text-sm text-gray-600">Gérez les news et actualités de l'application</p>
        </div>
        <Link
          href="/admin/posts/new"
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          ➕ Nouveau post
        </Link>
      </div>

      {/* Posts Table */}
      {posts && posts.length > 0 ? (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Titre</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Statut</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Créé</th>
                <th className="relative px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-sm font-medium ${typeColors[post.type]}`}>
                      {typeLabels[post.type]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{post.title}</div>
                    {post.excerpt && <div className="text-sm text-gray-500 truncate">{post.excerpt}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {post.published ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-0.5 text-sm font-medium text-green-800">
                        ✓ Publié
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-0.5 text-sm font-medium text-yellow-800">
                        ⏸ Brouillon
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(post.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="relative px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Link
                      href={`/admin/posts/${post.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Éditer
                    </Link>
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={deletingId === post.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      {deletingId === post.id ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-600">Aucun post pour le moment</p>
          <Link href="/admin/posts/new" className="mt-4 inline-flex text-blue-600 hover:text-blue-900">
            Créer le premier post →
          </Link>
        </div>
      )}
    </div>
  );
}
