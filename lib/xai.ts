/**
 * Client xAI (Grok Imagine) pour la génération de clips vidéo.
 * Utilise l'image par défaut du personnage et un prompt basé sur l'émotion.
 * @see https://docs.x.ai/docs/guides/video-generation
 */

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_VIDEO_BASE = process.env.XAI_VIDEO_BASE || 'https://api.x.ai/v1/videos';
const XAI_VIDEO_GENERATIONS_URL = process.env.XAI_VIDEO_URL || `${XAI_VIDEO_BASE}/generations`;

/** Durée de la vidéo générée (secondes). Variable d'environnement XAI_VIDEO_DURATION_SECONDS, défaut 3. */
export const XAI_VIDEO_DURATION_SECONDS = (() => {
  const val = process.env.XAI_VIDEO_DURATION_SECONDS;
  if (val == null || val === '') return 3;
  const n = parseInt(val, 10);
  return Number.isNaN(n) || n < 1 || n > 30 ? 3 : n;
})();

/** FPS des clips (pour calcul des frames). Variable d'environnement CLIP_DEFAULT_FPS, défaut 10. */
export const CLIP_DEFAULT_FPS = (() => {
  const val = process.env.CLIP_DEFAULT_FPS;
  if (val == null || val === '') return 10;
  const n = parseInt(val, 10);
  return Number.isNaN(n) || n < 1 || n > 60 ? 10 : n;
})();

/** Ratios supportés par xAI : 16:9, 4:3, 1:1, 9:16, 3:4, 3:2, 2:3 */
const XAI_ASPECT_RATIOS: Array<{ value: string; ratio: number }> = [
  { value: '1:1', ratio: 1 },
  { value: '16:9', ratio: 16 / 9 },
  { value: '4:3', ratio: 4 / 3 },
  { value: '3:2', ratio: 3 / 2 },
  { value: '9:16', ratio: 9 / 16 },
  { value: '3:4', ratio: 3 / 4 },
  { value: '2:3', ratio: 2 / 3 },
];

/**
 * Déduit le ratio d'aspect xAI depuis les dimensions du personnage (imageWidth × imageHeight).
 * Cas courants : 240×280 (portrait) → 3:4, 280×240 (paysage) → 4:3, 240×240 (carré) → 1:1.
 */
export function getAspectRatioFromCharacter(width: number, height: number): string {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const targetRatio = w / h;

  let closest = XAI_ASPECT_RATIOS[0];
  let minDiff = Math.abs(targetRatio - closest.ratio);

  for (const ar of XAI_ASPECT_RATIOS) {
    const diff = Math.abs(targetRatio - ar.ratio);
    if (diff < minDiff) {
      minDiff = diff;
      closest = ar;
    }
  }

  return closest.value;
}

export function buildPromptForEmotion(
  emotionKey: string,
  emotionLabel: string,
  characterContext?: string | null,
  customPrompt?: string | null,
  variantPrompt?: string | null,
  durationS?: number | null
): string {
  let base = '';
  const effectiveDuration = durationS ?? XAI_VIDEO_DURATION_SECONDS;

  // Si un contexte de personnage est fourni, l'ajouter en préambule
  if (characterContext?.trim()) {
    base += `Description du personnage : ${characterContext.trim()}. `;
  }

  base +=
    `Animation de ${effectiveDuration} seconde${effectiveDuration > 1 ? 's' : ''} exprimant uniquement l'émotion "${emotionLabel}" (${emotionKey}). ` +
    `Pas de bras, pas de corps : on veut vraiment uniquement le visage, comme sur l'image de base. Cadrage serré sur le visage. ` +
    `Le personnage ne doit pas parler : pas de mouvements de bouche pour la parole, pas de dialogue. On veut seulement l'émotion (expression du visage, regard), pas la parole. ` +
    `Tu peux rester sur une animation simple (expression du visage uniquement) ou, si pertinent, ajouter des objets/accessoires pour illustrer l'émotion (ex: faim → manger, dormir → "zzzz"). Les artefacts ne sont pas obligatoires : une version basic sans objet convient très bien. ` +
    `Tous les objets ou artefacts ajoutés (bulles "zzz", aliments, accessoires, etc.) doivent être nettement séparables du fond et du visage, afin de pouvoir être découpés et isolés indépendamment en post-traitement. ` +
    `Interdit : rien ne doit couvrir tout l'écran (pas de pluie de confettis, pas d'effets plein écran, pas de particules qui envahissent la scène). Chaque élément doit rester localisé et distinct pour permettre un découpage par régions. ` +
    `Transition obligatoire : la dernière frame doit être identique à la première frame (retour à l'image de base) pour permettre une boucle fluide. ` +
    `Le personnage doit rester fidèle à l'image de référence. `;

  if (customPrompt?.trim()) {
    base += ` Personnalisation pour cette émotion : ${customPrompt.trim()}.`;
  }

  if (variantPrompt?.trim()) {
    base += ` Détails pour cette variante : ${variantPrompt.trim()}.`;
  }

  return base;
}

export interface GenerateVideoOptions {
  prompt: string;
  /** URL publique de l'image de référence (image par défaut du personnage) */
  imageUrl: string | null;
  /** Dimensions du personnage pour déduire aspect_ratio (imageWidth × imageHeight) */
  width?: number;
  height?: number;
  /** Durée de la vidéo (secondes) */
  durationS?: number;
}

export interface GenerateVideoResult {
  jobId?: string;
  videoUrl?: string;
  error?: string;
}

/**
 * Appelle l'API xAI pour générer une vidéo (image-to-video).
 * Si XAI_API_KEY n'est pas défini, retourne { error: 'XAI_API_KEY manquant' }.
 */
export async function generateVideo(options: GenerateVideoOptions): Promise<GenerateVideoResult> {
  if (!XAI_API_KEY) {
    return { error: 'XAI_API_KEY manquant. Définissez la variable d\'environnement pour activer la génération.' };
  }

  try {
    const width = options.width ?? 240;
    const height = options.height ?? 280;
    const aspectRatio = getAspectRatioFromCharacter(width, height);

    const body: Record<string, unknown> = {
      model: 'grok-imagine-video',
      prompt: options.prompt,
      duration: options.durationS ?? XAI_VIDEO_DURATION_SECONDS,
      aspect_ratio: aspectRatio,
      resolution: '480p',
    };
    if (options.imageUrl) {
      body.image = { url: options.imageUrl };
    }

    const res = await fetch(XAI_VIDEO_GENERATIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      return { error: `xAI API: ${res.status} ${text}` };
    }

    let data: Record<string, unknown> = {};
    if (text.trim()) {
      try {
        data = JSON.parse(text) as Record<string, unknown>;
      } catch {
        return { error: 'Réponse xAI invalide (non JSON)' };
      }
    }

    // Log de la réponse complète au cas où (debug)
    console.log('[xAI generateVideo POST response]', { status: res.status, body: data });

    // Doc xAI: response is { request_id: "..." }
    const jobId = data.request_id as string | undefined;
    const videoUrl = data.url as string | undefined;

    if (!jobId && !videoUrl) {
      console.warn('[xAI generateVideo] Aucun jobId ni videoUrl trouvé dans la réponse. Keys:', Object.keys(data));
    }

    return { jobId, videoUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `xAI: ${message}` };
  }
}

export type VideoJobStatus = 'queued' | 'in_progress' | 'completed' | 'failed';

export interface GetVideoResult {
  status: VideoJobStatus;
  videoUrl?: string;
  error?: string;
}

/**
 * Récupère le résultat d'un job de génération vidéo xAI (poll).
 * GET https://api.x.ai/v1/videos/{request_id}
 */
export async function getVideoGenerationResult(jobId: string): Promise<GetVideoResult> {
  if (!XAI_API_KEY) {
    return { status: 'failed', error: 'XAI_API_KEY manquant' };
  }

  const url = `${XAI_VIDEO_BASE}/${jobId}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
    });

    const text = await res.text();

    if (!res.ok) {
      return { status: 'failed', error: `xAI API: ${res.status} ${text}` };
    }
    if (!text.trim()) {
      return { status: 'in_progress', error: 'Réponse xAI vide (corps absent)' };
    }

    let data: {
      status?: string;
      url?: string;
      video?: { url?: string; duration?: number };
      error?: string;
    };
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      return { status: 'failed', error: 'Réponse xAI invalide (non JSON)' };
    }
    // Log de la réponse complète au cas où (debug)
    console.log('[xAI getVideoGenerationResult]', { url, status: res.status, body: data });
    // Réponse xAI: quand c'est prêt, body.video.url est présent
    const videoUrl = data.video?.url ?? data.url;

    if (videoUrl) {
      return { status: 'completed', videoUrl };
    }
    if (data.status === 'failed') {
      return { status: 'failed', error: data.error ?? 'Job failed' };
    }
    return { status: (data.status as VideoJobStatus) === 'queued' ? 'queued' : 'in_progress' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'failed', error: `xAI: ${message}` };
  }
}
