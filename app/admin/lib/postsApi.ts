import { api } from './api';

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

export const postsApi = {
  async getAll(filters?: { type?: string; published?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.published !== undefined) params.append('published', String(filters.published));

    const result = await api<Post[]>('GET', `/admin/posts?${params.toString()}`);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  async getById(id: string) {
    const result = await api<Post>('GET', `/admin/posts/${id}`);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  async create(data: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>) {
    const result = await api<Post>('POST', '/admin/posts', data);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  async update(id: string, data: Partial<Omit<Post, 'id' | 'createdAt' | 'updatedAt'>>) {
    const result = await api<Post>('PATCH', `/admin/posts/${id}`, data);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  async delete(id: string) {
    const result = await api<{ id: string }>('DELETE', `/admin/posts/${id}`);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};
