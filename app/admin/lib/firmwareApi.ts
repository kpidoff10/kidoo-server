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
  partCount: number;
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

  /**
   * Upload un .zip contenant part0.bin, part1.bin, ... (max 2 Mo par part).
   * Le serveur décompresse et uploade chaque part vers R2, crée ou met à jour le firmware.
   */
  uploadZip: async (params: {
    file: File;
    model: string;
    version: string;
    changelog?: string;
  }): Promise<{ success: true; data: Firmware } | { success: false; error: string; errorCode?: string }> => {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('model', params.model);
    formData.append('version', params.version);
    if (params.changelog) formData.append('changelog', params.changelog);

    const res = await fetch('/api/admin/firmware/upload-zip', {
      method: 'POST',
      credentials: 'include',
      body: formData,
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
  },
};
