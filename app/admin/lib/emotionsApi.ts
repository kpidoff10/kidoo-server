/**
 * API client pour les émotions (admin)
 */

export interface Emotion {
  id: string;
  key: string;
  label: string;
  promptCustom?: string | null;
  createdAt: string;
  updatedAt: string;
}

async function api<T>(
  url: string,
  options?: RequestInit
): Promise<{ success: true; data: T } | { success: false; error: string; errorCode?: string }> {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const json = await res.json();

  if (!res.ok) {
    return {
      success: false,
      error: json.error ?? 'Erreur inconnue',
      errorCode: json.errorCode,
    };
  }

  return { success: true, data: json.data };
}

export const emotionsApi = {
  list: () => api<Emotion[]>('/api/admin/emotions'),

  get: (id: string) => api<Emotion>(`/api/admin/emotions/${id}`),

  create: (input: { key: string; label: string; promptCustom?: string | null }) =>
    api<Emotion>('/api/admin/emotions', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (id: string, input: { label: string; promptCustom?: string | null }) =>
    api<Emotion>(`/api/admin/emotions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  delete: (id: string) =>
    api<{ id: string }>(`/api/admin/emotions/${id}`, {
      method: 'DELETE',
    }),
};
