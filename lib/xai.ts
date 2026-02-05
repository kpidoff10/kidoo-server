/**
 * Client xAI (Grok Imagine) pour la génération de clips vidéo.
 * Utilise l'image par défaut du personnage et un prompt basé sur l'émotion.
 * @see https://docs.x.ai/docs/guides/video-generation
 */

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_VIDEO_BASE = process.env.XAI_VIDEO_BASE || 'https://api.x.ai/v1/videos';
const XAI_VIDEO_GENERATIONS_URL = process.env.XAI_VIDEO_URL || `${XAI_VIDEO_BASE}/generations`;

export function buildPromptForEmotion(
  emotionKey: string,
  emotionLabel: string,
  customPrompt?: string | null
): string {
  const base =
    `Animation de 3 secondes exprimant uniquement l'émotion "${emotionLabel}" (${emotionKey}). ` +
    `Pas de bras, pas de corps : on veut vraiment uniquement le visage, comme sur l'image de base. Cadrage serré sur le visage. ` +
    `Le personnage ne doit pas parler : pas de mouvements de bouche pour la parole, pas de dialogue. On veut seulement l'émotion (expression du visage, regard), pas la parole. ` +
    `N'hésite pas à ajouter des objets ou accessoires pour illustrer l'émotion (ex: faim → manger un poulet ou demander son biberon, dormir → "zzzz", etc.). ` +
    `Le personnage doit rester fidèle à l'image de référence. ` +
    `Important : la dernière frame doit être identique à la première frame pour une homogénéité et une boucle visuelle parfaite.`;
  if (customPrompt?.trim()) {
    return `${base} Personnalisation pour cette émotion : ${customPrompt.trim()}.`;
  }
  return base;
}

export interface GenerateVideoOptions {
  prompt: string;
  /** URL publique de l'image de référence (image par défaut du personnage) */
  imageUrl: string | null;
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
    const body: Record<string, unknown> = {
      model: 'grok-imagine-video',
      prompt: options.prompt,
      duration: 3,
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
