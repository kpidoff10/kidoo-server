'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  charactersApi,
  type Character,
  type CharacterClipDetail,
  type UpdateClipInput,
} from '../lib/charactersApi';
import type { CreateCharacterInput, UpdateCharacterInput } from '@kidoo/shared';

const CHARACTER_KEYS = {
  all: ['admin', 'characters'] as const,
  list: () => [...CHARACTER_KEYS.all, 'list'] as const,
  detail: (id: string) => [...CHARACTER_KEYS.all, 'detail', id] as const,
};

export function useCharacters() {
  return useQuery({
    queryKey: CHARACTER_KEYS.list(),
    queryFn: async () => {
      const res = await charactersApi.list();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
  });
}

export function useCharacter(id: string | null) {
  return useQuery({
    queryKey: CHARACTER_KEYS.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      const res = await charactersApi.get(id);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCharacterInput) => {
      const res = await charactersApi.create(input);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHARACTER_KEYS.list() });
    },
  });
}

export function useUpdateCharacter(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCharacterInput) => {
      const res = await charactersApi.update(id, input);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CHARACTER_KEYS.list() });
      queryClient.setQueryData<Character>(CHARACTER_KEYS.detail(id), data);
    },
  });
}

export function useDeleteCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await charactersApi.delete(id);
      if (!res.success) throw new Error(res.error);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: CHARACTER_KEYS.list() });
      queryClient.removeQueries({ queryKey: CHARACTER_KEYS.detail(deletedId) });
    },
  });
}

const CHARACTER_CLIPS_KEY = (characterId: string) =>
  [...CHARACTER_KEYS.detail(characterId), 'clips'] as const;

const CLIP_DETAIL_KEY = (clipId: string) => ['admin', 'clips', 'detail', clipId] as const;

export function useClip(clipId: string | null) {
  return useQuery({
    queryKey: CLIP_DETAIL_KEY(clipId ?? ''),
    queryFn: async () => {
      if (!clipId) return null;
      const res = await charactersApi.getClip(clipId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: !!clipId,
  });
}

export function useUpdateClip(clipId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateClipInput) => {
      const res = await charactersApi.updateClip(clipId, input);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(CLIP_DETAIL_KEY(clipId), data);
      queryClient.invalidateQueries({ queryKey: CHARACTER_CLIPS_KEY(data.characterId) });
    },
  });
}

export function useCharacterClips(characterId: string | null) {
  return useQuery({
    queryKey: CHARACTER_CLIPS_KEY(characterId ?? ''),
    queryFn: async () => {
      if (!characterId) return [];
      const res = await charactersApi.getClips(characterId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: !!characterId,
  });
}

export function useGenerateClip(characterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emotionKey: string) => {
      const res = await charactersApi.generateClip(characterId, emotionKey);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHARACTER_CLIPS_KEY(characterId) });
    },
  });
}

export function useUploadClip(characterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ emotionKey, file }: { emotionKey: string; file: File }) => {
      const res = await charactersApi.uploadClip(characterId, emotionKey, file);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHARACTER_CLIPS_KEY(characterId) });
    },
  });
}

export function useSyncClipStatus(characterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clipId: string) => {
      const res = await charactersApi.syncClipStatus(clipId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHARACTER_CLIPS_KEY(characterId) });
    },
  });
}

export function useTrimClip(clipId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ startTimeS, endTimeS }: { startTimeS: number; endTimeS: number }) => {
      const res = await charactersApi.trimClip(clipId, startTimeS, endTimeS);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIP_DETAIL_KEY(clipId) });
    },
  });
}

export function useGenerateRegionImages(clipId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await charactersApi.generateRegionImages(clipId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIP_DETAIL_KEY(clipId) });
    },
  });
}

/** Invalide le cache du clip (ex. après génération côté client) */
export function useInvalidateClip(clipId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CLIP_DETAIL_KEY(clipId) });
}
