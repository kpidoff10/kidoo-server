/**
 * API client pour les personnages (admin)
 */

import type { CreateCharacterInput, UpdateCharacterInput } from '@kidoo/shared';

export interface Character {
  id: string;
  name: string | null;
  defaultImageUrl: string | null;
  sex: string;
  personality: string;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterClip {
  id: string;
  characterId: string;
  emotionId: string;
  status: string;
  fileUrl: string | null;
  previewUrl: string | null;
  weight: number;
  emotion: { id: string; key: string; label: string };
  createdAt: string;
  updatedAt: string;
}

/** Détail d'un clip (pour la page /admin/clips/[id]) */
export interface CharacterClipDetail extends CharacterClip {
  character: { id: string; name: string | null };
  prompt?: string | null;
  /** Métadonnées optionnelles (fps, durée, nombre de frames) pour la barre de timeline */
  fps?: number | null;
  durationS?: number | null;
  frames?: number | null;
  /** Frame (0-based) début de boucle */
  loopStartFrame?: number | null;
  /** Frame (0-based) fin de boucle (si null = dernière frame) */
  loopEndFrame?: number | null;
  /** Régions visage frame 0 (rétrocompat) */
  faceRegions?: FaceRegions | null;
  /** Régions par frame (clé = index de frame en string) */
  faceRegionsByFrame?: Record<string, FaceRegions> | null;
  /** Artefacts par frame (clé = index de frame en string), ex. effet "zzz" */
  artifactsByFrame?: Record<string, ArtifactRegion[]> | null;
}

/** Un artefact (région nommée, ex. "zzz") — couleur violette dans l’éditeur */
export interface ArtifactRegion {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cornerStyle?: CornerStyle;
  /** URL de l'image masque (fond noir + région blanche) sur R2 */
  imageUrl?: string | null;
}

/** Style des coins de la région (arrondis ou carrés) */
export type CornerStyle = 'rounded' | 'square';

/** Une région normalisée 0-1 (x, y = coin supérieur gauche; w, h = largeur/hauteur) */
export interface FaceRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  cornerStyle?: CornerStyle;
  /** URL de l'image masque (fond noir + région blanche) sur R2 */
  imageUrl?: string | null;
}

export interface FaceRegions {
  leftEye?: FaceRegion;
  rightEye?: FaceRegion;
  mouth?: FaceRegion;
}

export interface UpdateClipInput {
  loopStartFrame?: number | null;
  loopEndFrame?: number | null;
  faceRegions?: FaceRegions | null;
  /** Régions par frame (clé = index de frame en string) */
  faceRegionsByFrame?: Record<string, FaceRegions> | null;
  /** Artefacts par frame (clé = index de frame en string) */
  artifactsByFrame?: Record<string, ArtifactRegion[]> | null;
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

export const charactersApi = {
  list: () => api<Character[]>('/api/admin/characters'),

  get: (id: string) => api<Character>(`/api/admin/characters/${id}`),

  create: (input: CreateCharacterInput) =>
    api<Character>('/api/admin/characters', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (id: string, input: UpdateCharacterInput) =>
    api<Character>(`/api/admin/characters/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  delete: (id: string) =>
    api<{ id: string }>(`/api/admin/characters/${id}`, {
      method: 'DELETE',
    }),

  /** Clips du personnage (pour onglet Émotions) */
  getClips: (characterId: string) =>
    api<CharacterClip[]>(`/api/admin/characters/${characterId}/clips`),

  /** Détail d'un clip (pour page /admin/clips/[id]) */
  getClip: (clipId: string) =>
    api<CharacterClipDetail>(`/api/admin/clips/${clipId}`),

  /** Mettre à jour un clip (ex. début de boucle) */
  updateClip: (clipId: string, input: UpdateClipInput) =>
    api<CharacterClipDetail>(`/api/admin/clips/${clipId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  /** Générer un clip via xAI (Grok Imagine) pour une émotion */
  generateClip: (characterId: string, emotionKey: string) =>
    api<{ clipId: string; jobId?: string; status: string; prompt: string }>(
      '/api/admin/clips/generate',
      {
        method: 'POST',
        body: JSON.stringify({ characterId, emotionKey }),
      }
    ),

  /** Vérifier le statut du job xAI et mettre à jour le clip (GENERATING → READY/FAILED) */
  syncClipStatus: (clipId: string) =>
    api<{ clipId: string; status: string; videoUrl?: string; jobStatus?: string; message?: string }>(
      `/api/admin/clips/${clipId}/sync-status`,
      { method: 'POST' }
    ),

  /** Convertir manuellement le .bin à partir du preview (quand previewUrl existe mais pas fileUrl) */
  convertClip: (clipId: string) =>
    api<{ clipId: string; status: string; fileUrl: string }>(
      `/api/admin/clips/${clipId}/convert`,
      { method: 'POST' }
    ),

  /** Découper la vidéo preview (début/fin en secondes), enregistre le nouveau MP4 sur Cloudflare */
  trimClip: (clipId: string, startTimeS: number, endTimeS: number) =>
    api<{ clipId: string; previewUrl: string; durationS: number; frames: number }>(
      `/api/admin/clips/${clipId}/trim`,
      {
        method: 'POST',
        body: JSON.stringify({ startTimeS, endTimeS }),
      }
    ),

  /** Génère une image masque (fond noir + région blanche) par région et par artefact, upload R2, enregistre les URL en BDD */
  generateRegionImages: (clipId: string) =>
    api<{
      message: string;
      generatedRegions: Array<{ frameIndex: number; regionKey: string; imageUrl: string }>;
      generatedArtifacts: Array<{ frameIndex: number; artifactId: string; name: string; imageUrl: string }>;
    }>(`/api/admin/clips/${clipId}/generate-region-images`, { method: 'POST' }),

  /** URL signée pour upload d'image (puis PUT direct vers R2) */
  getUploadImageUrl: (characterId: string, params: { fileName: string; fileSize: number; contentType?: string }) =>
    api<{ uploadUrl: string; path: string; publicUrl: string }>(
      `/api/admin/characters/${characterId}/upload-image-url`,
      {
        method: 'POST',
        body: JSON.stringify({
          fileName: params.fileName,
          fileSize: params.fileSize,
          contentType: params.contentType,
        }),
      }
    ),

  /**
   * Upload un fichier image vers R2 puis retourne l'URL publique.
   * À utiliser après création du personnage (characterId requis).
   */
  uploadImage: async (
    characterId: string,
    file: File
  ): Promise<{ success: true; publicUrl: string } | { success: false; error: string }> => {
    const urlRes = await charactersApi.getUploadImageUrl(characterId, {
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type || undefined,
    });
    if (!urlRes.success) return { success: false, error: urlRes.error };

    const { uploadUrl, publicUrl } = urlRes.data;

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ success: true, publicUrl });
        } else {
          resolve({ success: false, error: `Upload échoué: ${xhr.status}` });
        }
      });
      xhr.addEventListener('error', () => resolve({ success: false, error: 'Erreur réseau' }));
      xhr.send(file);
    });
  },
};
