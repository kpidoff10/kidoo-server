'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TimelineFrame } from '../../../types/emotion-video';

// Types pour les EmotionVideos
export interface EmotionVideo {
  id: string;
  emotionId: string;
  sourceClipId: string;
  name: string | null;
  fps: number;
  width: number;
  height: number;
  introTimeline: TimelineFrame[];
  loopTimeline: TimelineFrame[];
  exitTimeline: TimelineFrame[];
  status: 'DRAFT' | 'GENERATING' | 'READY' | 'FAILED' | 'DISABLED';
  binUrl: string | null;
  idxUrl: string | null;  // URL du fichier .idx
  sha256: string | null;
  sizeBytes: number | null;
  totalFrames: number | null;
  durationS: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmotionVideoInput {
  emotionId: string;
  sourceClipId: string;
  name?: string;
  introTimeline: TimelineFrame[];
  loopTimeline: TimelineFrame[];
  exitTimeline: TimelineFrame[];
}

export interface UpdateEmotionVideoInput {
  name?: string;
  introTimeline?: TimelineFrame[];
  loopTimeline?: TimelineFrame[];
  exitTimeline?: TimelineFrame[];
}

// Query keys
const EMOTION_VIDEO_KEYS = {
  all: ['admin', 'emotion-videos'] as const,
  byClip: (clipId: string) => [...EMOTION_VIDEO_KEYS.all, 'clip', clipId] as const,
  detail: (id: string) => [...EMOTION_VIDEO_KEYS.all, 'detail', id] as const,
};

// API client
const emotionVideosApi = {
  async listByClip(clipId: string) {
    const res = await fetch(`/api/admin/clips/${clipId}/emotion-videos`);
    if (!res.ok) throw new Error('Erreur lors du chargement des vidéos');
    return res.json() as Promise<{ success: true; data: EmotionVideo[] }>;
  },

  async get(id: string) {
    const res = await fetch(`/api/admin/emotion-videos/${id}`);
    if (!res.ok) throw new Error('Erreur lors du chargement de la vidéo');
    return res.json() as Promise<{ success: true; data: EmotionVideo }>;
  },

  async create(input: CreateEmotionVideoInput) {
    const res = await fetch('/api/admin/emotion-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('Erreur lors de la création de la vidéo');
    return res.json() as Promise<{ success: true; data: EmotionVideo }>;
  },

  async update(id: string, input: UpdateEmotionVideoInput) {
    const res = await fetch(`/api/admin/emotion-videos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('Erreur lors de la mise à jour de la vidéo');
    return res.json() as Promise<{ success: true; data: EmotionVideo }>;
  },

  async delete(id: string) {
    const res = await fetch(`/api/admin/emotion-videos/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Erreur lors de la suppression de la vidéo');
    return res.json() as Promise<{ success: true }>;
  },

  async generate(id: string) {
    const res = await fetch(`/api/admin/emotion-videos/${id}/generate`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Erreur lors de la génération de la vidéo');
    return res.json() as Promise<{ success: true; data: EmotionVideo }>;
  },
};

// Hooks
export function useEmotionVideosByClip(clipId: string | null) {
  return useQuery({
    queryKey: EMOTION_VIDEO_KEYS.byClip(clipId ?? ''),
    queryFn: async () => {
      if (!clipId) return [];
      const res = await emotionVideosApi.listByClip(clipId);
      if (!res.success) throw new Error('Erreur');
      return res.data;
    },
    enabled: !!clipId,
  });
}

export function useEmotionVideo(id: string | null) {
  return useQuery({
    queryKey: EMOTION_VIDEO_KEYS.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      const res = await emotionVideosApi.get(id);
      if (!res.success) throw new Error('Erreur');
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateEmotionVideo(clipId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEmotionVideoInput) => {
      const res = await emotionVideosApi.create(input);
      if (!res.success) throw new Error('Erreur');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMOTION_VIDEO_KEYS.byClip(clipId) });
    },
  });
}

export function useUpdateEmotionVideo(id: string, clipId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateEmotionVideoInput) => {
      const res = await emotionVideosApi.update(id, input);
      if (!res.success) throw new Error('Erreur');
      return res.data;
    },
    onSuccess: (data) => {
      // Mise à jour optimiste : mettre à jour le cache directement sans refetch
      queryClient.setQueryData(EMOTION_VIDEO_KEYS.detail(id), data);

      // Mettre à jour aussi la liste byClip pour refléter les changements
      queryClient.setQueryData(
        EMOTION_VIDEO_KEYS.byClip(clipId),
        (old: EmotionVideo[] | undefined) => {
          if (!old) return [data];
          return old.map((ev) => (ev.id === id ? data : ev));
        }
      );
    },
  });
}

export function useDeleteEmotionVideo(clipId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await emotionVideosApi.delete(id);
      if (!res.success) throw new Error('Erreur');
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.removeQueries({ queryKey: EMOTION_VIDEO_KEYS.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: EMOTION_VIDEO_KEYS.byClip(clipId) });
    },
  });
}

export function useGenerateEmotionVideo(id: string, clipId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await emotionVideosApi.generate(id);
      if (!res.success) throw new Error('Erreur');
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(EMOTION_VIDEO_KEYS.detail(id), data);
      queryClient.invalidateQueries({ queryKey: EMOTION_VIDEO_KEYS.byClip(clipId) });
    },
  });
}
