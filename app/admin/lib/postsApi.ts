export interface Post {
  id: string;
  title: string;
  excerpt?: string | null;
  content: string;
  imageUrl?: string | null;
  type: 'update' | 'promo' | 'feature' | 'news';
  published: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

async function api<T>(
  method: string,
  url: string,
  body?: any
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();

  if (!res.ok) {
    return {
      success: false,
      error: json.error ?? 'Erreur inconnue',
    };
  }

  return { success: true, data: json.data };
}

export const postsApi = {
  getAll: (filters?: { type?: string; published?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.published !== undefined) params.append('published', String(filters.published));
    return api<Post[]>('GET', `/api/admin/posts?${params.toString()}`);
  },

  getById: (id: string) => api<Post>('GET', `/api/admin/posts/${id}`),

  create: (data: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>) =>
    api<Post>('POST', '/api/admin/posts', data),

  update: (id: string, data: Partial<Omit<Post, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api<Post>('PATCH', `/api/admin/posts/${id}`, data),

  delete: (id: string) => api<{ id: string }>('DELETE', `/api/admin/posts/${id}`),
};
