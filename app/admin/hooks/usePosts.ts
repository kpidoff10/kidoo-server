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
    queryFn: () => postsApi.getAll(filters),
  });
}

export function usePost(id?: string) {
  return useQuery({
    queryKey: id ? POST_KEYS.detail(id) : [],
    queryFn: () => (id ? postsApi.getById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>) =>
      postsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POST_KEYS.list() });
    },
  });
}

export function useUpdatePost(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Omit<Post, 'id' | 'createdAt' | 'updatedAt'>>) =>
      postsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POST_KEYS.list() });
      queryClient.invalidateQueries({ queryKey: POST_KEYS.detail(id) });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => postsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POST_KEYS.list() });
    },
  });
}
