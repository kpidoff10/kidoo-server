/**
 * Job worker : MP4 xAI → transcodage RGB565 + preview → upload R2
 * Utilise ffmpeg-api.com (https://ffmpeg-api.com/) pour le transcodage.
 */

import { createHash } from 'crypto';
import { uploadClipFile } from './r2';

const FFMPEG_API_URL = process.env.FFMPEG_API_URL || 'https://api.ffmpeg-api.com';
const FFMPEG_API_KEY = process.env.FFMPEG_API_KEY;

const TARGET_WIDTH = 240;
const TARGET_HEIGHT = 280;
const TARGET_FPS = 10;
const TARGET_FRAMES = 60;

// -1:-1 centre automatiquement (évite parenthèses rejetées par ffmpeg-api.com)
const SCALE_FILTER = `scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:force_original_aspect_ratio=decrease,pad=${TARGET_WIDTH}:${TARGET_HEIGHT}:-1:-1`;

export interface ClipWorkerResult {
  fileUrl: string;
  previewUrl: string;
  sha256: string;
  sizeBytes: number;
}

export interface ClipWorkerError {
  error: string;
}

interface FfmpegTask {
  inputs: Array<{ file_path: string; options?: string[] }>;
  outputs: Array<{ file: string; options?: string[]; maps?: string[] }>;
  filter_complex?: string;
}

interface FfmpegResult {
  ok: boolean;
  result?: Array<{ file: string; download_url?: string; size_bytes?: number }>;
  outputs?: Array<{ file: string; download_url?: string; file_size?: number }>;
  error?: string;
}

/**
 * Appelle ffmpeg-api.com POST /ffmpeg/process (JSON, endpoint actuel).
 */
async function callFfmpegProcess(videoUrl: string, task: FfmpegTask): Promise<FfmpegResult> {
  if (!FFMPEG_API_KEY) {
    throw new Error('FFMPEG_API_KEY manquant dans les variables d\'environnement');
  }

  const res = await fetch(`${FFMPEG_API_URL}/ffmpeg/process`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${FFMPEG_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ task }),
  });

  const data = (await res.json()) as FfmpegResult;

  if (!res.ok) {
    throw new Error(data.error || `ffmpeg-api.com erreur: ${res.status} ${res.statusText}`);
  }

  return data;
}

/**
 * Télécharge un fichier depuis une URL.
 */
async function downloadFile(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Téléchargement échoué: ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Transcode la vidéo xAI en .bin RGB565 via ffmpeg-api.com.
 */
async function transcodeToBin(videoUrl: string): Promise<Buffer> {
  const result = await callFfmpegProcess(videoUrl, {
    inputs: [{ file_path: videoUrl, options: ['-stream_loop', '1'] }],
    filter_complex: `[0:v]${SCALE_FILTER}[out]`,
    outputs: [
      {
        file: 'video.bin',
        maps: ['[out]'],
        options: [
          '-r',
          String(TARGET_FPS),
          '-t',
          '6',
          '-vframes',
          String(TARGET_FRAMES),
          '-f',
          'rawvideo',
          '-pix_fmt',
          'rgb565le',
        ],
      },
    ],
  });

  const output = result.result?.[0] ?? result.outputs?.[0];
  if (!result.ok || !output?.download_url) {
    throw new Error(result.error || 'ffmpeg-api.com: pas de download_url pour video.bin');
  }

  return downloadFile(output.download_url);
}

/**
 * Produit le preview MP4 via ffmpeg-api.com.
 */
async function producePreview(videoUrl: string): Promise<Buffer> {
  const result = await callFfmpegProcess(videoUrl, {
    inputs: [{ file_path: videoUrl, options: ['-stream_loop', '1'] }],
    filter_complex: `[0:v]${SCALE_FILTER}[out]`,
    outputs: [
      {
        file: 'preview.mp4',
        maps: ['[out]'],
        options: [
          '-r',
          String(TARGET_FPS),
          '-t',
          '6',
          '-vframes',
          String(TARGET_FRAMES),
          '-c:v',
          'libx264',
          '-crf',
          '23',
          '-an',
          '-movflags',
          '+faststart',
        ],
      },
    ],
  });

  const output = result.result?.[0] ?? result.outputs?.[0];
  if (!result.ok || !output?.download_url) {
    throw new Error(result.error || 'ffmpeg-api.com: pas de download_url pour preview.mp4');
  }

  return downloadFile(output.download_url);
}

/**
 * Découpe une vidéo entre startS et endS (en secondes) via ffmpeg-api.com.
 * Retourne le buffer MP4 du segment.
 */
export async function trimVideo(
  videoUrl: string,
  startS: number,
  endS: number
): Promise<Buffer> {
  const result = await callFfmpegProcess(videoUrl, {
    inputs: [
      {
        file_path: videoUrl,
        options: ['-ss', String(startS), '-to', String(endS)],
      },
    ],
    outputs: [
      {
        file: 'trimmed.mp4',
        options: ['-c', 'copy', '-an', '-movflags', '+faststart'],
      },
    ],
  });

  const output = result.result?.[0] ?? result.outputs?.[0];
  if (!result.ok || !output?.download_url) {
    throw new Error(result.error || 'ffmpeg-api.com: pas de download_url pour trimmed.mp4');
  }

  return downloadFile(output.download_url);
}

/**
 * Découpe le preview d'un clip, upload sur R2 et retourne la nouvelle URL + durée.
 * Ne touche pas au .bin (géré uniquement en MP4 pour le moment).
 */
export async function trimClipPreview(
  clipId: string,
  previewUrl: string,
  startS: number,
  endS: number
): Promise<{ previewUrl: string; durationS: number }> {
  const buffer = await trimVideo(previewUrl, startS, endS);
  const durationS = Math.max(0, endS - startS);
  const newPreviewUrl = await uploadClipFile(
    clipId,
    'preview.mp4',
    buffer,
    'video/mp4'
  );
  return { previewUrl: newPreviewUrl, durationS };
}

/**
 * Convertit uniquement le .bin à partir d'un preview MP4 existant.
 * Utilisé quand on a previewUrl mais pas fileUrl (conversion manuelle).
 * Ne régénère pas le preview, garde l'existant.
 */
export async function processClipFromPreviewUrl(
  clipId: string,
  previewUrl: string
): Promise<
  | { fileUrl: string; sha256: string; sizeBytes: number }
  | ClipWorkerError
> {
  try {
    const binBuffer = await transcodeToBin(previewUrl);
    const sha256 = createHash('sha256').update(binBuffer).digest('hex');
    const sizeBytes = binBuffer.length;
    const fileUrl = await uploadClipFile(
      clipId,
      'video.bin',
      binBuffer,
      'application/octet-stream'
    );
    return { fileUrl, sha256, sizeBytes };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

/**
 * Job worker : MP4 xAI → .bin RGB565 + preview MP4 → upload R2.
 * Retourne fileUrl, previewUrl, sha256, sizeBytes ou { error }.
 */
export async function processClipFromVideoUrl(
  clipId: string,
  videoUrl: string
): Promise<ClipWorkerResult | ClipWorkerError> {
  try {
    const [binBuffer, previewBuffer] = await Promise.all([
      transcodeToBin(videoUrl),
      producePreview(videoUrl),
    ]);

    const sha256 = createHash('sha256').update(binBuffer).digest('hex');
    const sizeBytes = binBuffer.length;

    const [fileUrl, previewUrl] = await Promise.all([
      uploadClipFile(clipId, 'video.bin', binBuffer, 'application/octet-stream'),
      uploadClipFile(clipId, 'preview.mp4', previewBuffer, 'video/mp4'),
    ]);

    return {
      fileUrl,
      previewUrl,
      sha256,
      sizeBytes,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}
