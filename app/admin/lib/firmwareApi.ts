/**
 * API client pour les firmwares (admin)
 * Utilise fetch avec credentials pour la session NextAuth
 */

import type { CreateFirmwareInput } from '@kidoo/shared';

export interface Firmware {
  id: string;
  model: string;
  version: string;
  url: string;
  path: string;
  fileName: string;
  fileSize: number;
  changelog: string | null;
  createdAt: string;
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

export interface UploadUrlResponse {
  uploadUrl: string;
  path: string;
  publicUrl: string;
}

export const firmwareApi = {
  listByModel: (model: string) =>
    api<Firmware[]>(`/api/admin/firmware?model=${encodeURIComponent(model)}`),

  getUploadUrl: (params: {
    model: string;
    version: string;
    fileName: string;
    fileSize: number;
  }) =>
    api<UploadUrlResponse>('/api/admin/firmware/upload-url', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  create: (input: CreateFirmwareInput) =>
    api<Firmware>('/api/admin/firmware', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  delete: (id: string) =>
    api<{ id: string }>(`/api/admin/firmware/${id}`, {
      method: 'DELETE',
    }),
};
