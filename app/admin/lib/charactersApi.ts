/**
 * API client pour les personnages (admin)
 */

import type { CreateCharacterInput, UpdateCharacterInput } from '@kidoo/shared';

export interface Character {
  id: string;
  name: string | null;
  defaultImageUrl: string | null;
  characterContext: string | null;
  sex: string;
  personality: string;
  imageWidth: number;
  imageHeight: number;
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
  workingPreviewUrl?: string | null;
  weight: number;
  emotion: { id: string; key: string; label: string };
  createdAt: string;
  updatedAt: string;
}

/** URL de preview effective (travail si trim, sinon base). Ne jamais modifier previewUrl après récupération xAI. */
export function getEffectivePreviewUrl(clip: { previewUrl?: string | null; workingPreviewUrl?: string | null }): string | null {
  return clip.workingPreviewUrl ?? clip.previewUrl ?? null;
}

/** Détail d'un clip (pour la page /admin/clips/[id]) */
export interface CharacterClipDetail extends CharacterClip {
  character: { id: string; name: string | null; imageWidth?: number; imageHeight?: number };
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
  id?: string;
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
  generateClip: (characterId: string, emotionKey: string, variantPrompt?: string | null) =>
    api<{ clipId: string; jobId?: string; status: string; prompt: string }>(
      '/api/admin/clips/generate',
      {
        method: 'POST',
        body: JSON.stringify({ characterId, emotionKey, variantPrompt }),
      }
    ),

  /** Ajouter un clip manuellement en uploadant un MP4 */
  uploadClip: async (
    characterId: string,
    emotionKey: string,
    file: File
  ): Promise<{ success: true; data: { clipId: string; status: string; previewUrl: string } } | { success: false; error: string }> => {
    const formData = new FormData();
    formData.append('characterId', characterId);
    formData.append('emotionKey', emotionKey);
    formData.append('file', file);

    const res = await fetch('/api/admin/clips/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: json.error ?? 'Erreur lors de l\'upload',
      };
    }

    return { success: true, data: json.data };
  },

  /** Vérifier le statut du job xAI et mettre à jour le clip (GENERATING → READY/FAILED) */
  syncClipStatus: (clipId: string) =>
    api<{ clipId: string; status: string; videoUrl?: string; jobStatus?: string; message?: string }>(
      `/api/admin/clips/${clipId}/sync-status`,
      { method: 'POST' }
    ),

  /** Supprimer un clip */
  deleteClip: (clipId: string) =>
    api<{ id: string }>(
      `/api/admin/clips/${clipId}`,
      { method: 'DELETE' }
    ),

  /** Découper la vidéo preview (début/fin en secondes), enregistre le nouveau MP4 de travail sur R2 */
  trimClip: (clipId: string, startTimeS: number, endTimeS: number) =>
    api<{ clipId: string; workingPreviewUrl: string; durationS: number; frames: number }>(
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

  /** Upload une image région extraite côté client (même rendu que le tooltip) */
  uploadRegionImage: async (
    clipId: string,
    file: Blob,
    params: { type: 'region'; frameIndex: number; regionKey: string } | { type: 'artifact'; frameIndex: number; artifactId: string }
  ) => {
    const formData = new FormData();
    formData.append('file', file, 'region.png');
    formData.append('type', params.type);
    formData.append('frameIndex', String(params.frameIndex));
    if (params.type === 'region') {
      formData.append('regionKey', params.regionKey);
    } else {
      formData.append('artifactId', params.artifactId);
    }
    const res = await fetch(`/api/admin/clips/${clipId}/upload-region-image`, {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message ?? 'Upload échoué');
    return json;
  },

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
    // Normaliser le Content-Type (doit correspondre à celui utilisé pour signer)
    const contentType = file.type || 'image/jpeg';

    const urlRes = await charactersApi.getUploadImageUrl(characterId, {
      fileName: file.name,
      fileSize: file.size,
      contentType: contentType,
    });
    if (!urlRes.success) return { success: false, error: urlRes.error };

    const { uploadUrl, publicUrl } = urlRes.data;

    console.log('[Upload R2] Début upload:', {
      fileName: file.name,
      fileSize: file.size,
      contentType,
      uploadUrl: uploadUrl.substring(0, 100) + '...',
    });

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);

      // IMPORTANT: Utiliser EXACTEMENT le même Content-Type que celui utilisé pour signer l'URL
      xhr.setRequestHeader('Content-Type', contentType);

      xhr.addEventListener('load', () => {
        console.log('[Upload R2] Load event:', { status: xhr.status, statusText: xhr.statusText });
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ success: true, publicUrl });
        } else {
          console.error(`[Upload R2] Échec ${xhr.status}:`, xhr.responseText);
          resolve({ success: false, error: `Upload échoué: ${xhr.status}` });
        }
      });
      xhr.addEventListener('error', (e) => {
        console.error('[Upload R2] Erreur réseau (probablement CORS):', {
          event: e,
          readyState: xhr.readyState,
          status: xhr.status,
        });
        resolve({ success: false, error: 'Erreur réseau (vérifiez les règles CORS du bucket R2)' });
      });
      xhr.send(file);
    });
  },
};
