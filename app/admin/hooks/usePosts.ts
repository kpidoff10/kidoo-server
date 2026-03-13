'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi, Post } from '@/app/admin/lib/postsApi';

const POST_KEYS = {
  all: ['admin', 'posts'] as const,
  list: () => [...POST_KEYS.all, 'list'] as const,
  detail: (id: string) => [...POST_KEYS.all, 'detail', id] as const,
};

export function usePosts(filters?: { type?: string; published?: boolean }) {
  return useQuery({
    queryKey: [...POST_KEYS.list(), filters],
    queryFn: async () => {
      const response = await postsApi.getAll(filters);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error);
    },
  });
}

export function usePost(id?: string) {
  return useQuery({
    queryKey: id ? POST_KEYS.detail(id) : [],
    queryFn: async () => {
      if (!id) return null;
      const response = await postsApi.getById(id);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error);
    },
    enabled: !!id,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await postsApi.create(data);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POST_KEYS.list() });
    },
  });
}

export function useUpdatePost(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Omit<Post, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const response = await postsApi.update(id, data);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POST_KEYS.list() });
      queryClient.invalidateQueries({ queryKey: POST_KEYS.detail(id) });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await postsApi.delete(id);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POST_KEYS.list() });
    },
  });
}
