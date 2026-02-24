'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emotionsApi, type Emotion } from '../lib/emotionsApi';

const EMOTION_KEYS = {
  all: ['admin', 'emotions'] as const,
  list: () => [...EMOTION_KEYS.all, 'list'] as const,
  detail: (id: string) => [...EMOTION_KEYS.all, 'detail', id] as const,
};

export function useEmotions() {
  return useQuery({
    queryKey: EMOTION_KEYS.list(),
    queryFn: async () => {
      const res = await emotionsApi.list();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
  });
}

export function useEmotion(id: string | null) {
  return useQuery({
    queryKey: EMOTION_KEYS.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      const res = await emotionsApi.get(id);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateEmotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { key: string; label: string; promptCustom?: string | null }) => {
      const res = await emotionsApi.create(input);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMOTION_KEYS.list() });
    },
  });
}

export function useUpdateEmotion(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { label: string; promptCustom?: string | null }) => {
      const res = await emotionsApi.update(id, input);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data: Emotion) => {
      queryClient.invalidateQueries({ queryKey: EMOTION_KEYS.list() });
      queryClient.setQueryData<Emotion>(EMOTION_KEYS.detail(id), data);
    },
  });
}

export function useDeleteEmotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await emotionsApi.delete(id);
      if (!res.success) throw new Error(res.error);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: EMOTION_KEYS.list() });
      queryClient.removeQueries({ queryKey: EMOTION_KEYS.detail(deletedId) });
    },
  });
}
