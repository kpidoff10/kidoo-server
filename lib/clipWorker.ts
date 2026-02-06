/**
 * Job worker : MP4 xAI → transcodage MJPEG + preview → upload R2
 * Utilise ffmpeg-api.com (https://ffmpeg-api.com/) pour le transcodage.
 */

import { createHash } from 'crypto';
import { uploadClipFile } from './r2';
import { CLIP_DEFAULT_FPS } from './xai';

const FFMPEG_API_URL = process.env.FFMPEG_API_URL || 'https://api.ffmpeg-api.com';
const FFMPEG_API_KEY = process.env.FFMPEG_API_KEY;

const DEFAULT_WIDTH = 240;
const DEFAULT_HEIGHT = 280;
const DEFAULT_MAX_FRAMES = 300; // ~30s à 10fps, évite de tronquer les clips

// Renforcer les noirs : entrée 2%-100% → sortie 0-100% (gris très foncé → noir pur)
const LEVELS_FILTER =
  'colorlevels=rimin=0.02:gimin=0.02:bimin=0.02:rimax=1:gimax=1:bimax=1';

export interface TranscodeOptions {
  fps?: number;
  maxDurationS?: number;
  maxFrames?: number;
  width?: number;
  height?: number;
}

function buildScaleFilter(width: number, height: number): string {
  return `scale=${width}:${height}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${width}:${height}:-1:-1`;
}

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
export async function downloadFile(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Téléchargement échoué: ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Télécharge une vidéo depuis une URL (ex. xAI) et l'upload sur R2 comme preview.
 * Pas de transcodage : le fichier est stocké tel quel.
 * Le transcodage MJPEG sera fait plus tard dans "Création de la vidéo".
 */
export async function uploadVideoPreviewToR2(
  clipId: string,
  videoUrl: string
): Promise<{ previewUrl: string } | ClipWorkerError> {
  try {
    const buffer = await downloadFile(videoUrl);
    const previewUrl = await uploadClipFile(clipId, 'preview.mp4', buffer, 'video/mp4');
    return { previewUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

/**
 * Transcode la vidéo en MJPEG (suite de frames JPEG) via ffmpeg-api.com.
 * Chaque frame est un JPEG individuel délimité par SOI (0xFFD8) / EOI (0xFFD9).
 */
export async function transcodeToMjpeg(videoUrl: string, opts?: TranscodeOptions): Promise<Buffer> {
  const fps = opts?.fps ?? CLIP_DEFAULT_FPS;
  const maxFrames = opts?.maxFrames ?? DEFAULT_MAX_FRAMES;
  const width = opts?.width ?? DEFAULT_WIDTH;
  const height = opts?.height ?? DEFAULT_HEIGHT;
  const scaleFilter = buildScaleFilter(width, height);

  const outputOptions = [
    '-r', String(fps),
    '-vframes', String(maxFrames),
    '-c:v', 'mjpeg',
    '-q:v', '2',
    '-pix_fmt', 'yuvj444p',
    '-f', 'mjpeg',
  ];
  if (opts?.maxDurationS != null) {
    outputOptions.push('-t', String(opts.maxDurationS));
  }

  const result = await callFfmpegProcess(videoUrl, {
    inputs: [{ file_path: videoUrl, options: ['-stream_loop', '1'] }],
    // scale (net) → levels (noirs purs) → pad
    filter_complex: `[0:v]${scaleFilter},${LEVELS_FILTER}[out]`,
    outputs: [
      {
        file: 'video.mjpeg',
        maps: ['[out]'],
        options: outputOptions,
      },
    ],
  });

  const output = result.result?.[0] ?? result.outputs?.[0];
  if (!result.ok || !output?.download_url) {
    throw new Error(result.error || 'ffmpeg-api.com: pas de download_url pour video.mjpeg');
  }

  return downloadFile(output.download_url);
}

/**
 * Transcode la vidéo xAI en .bin RGB565 via ffmpeg-api.com.
 */
async function transcodeToBin(videoUrl: string, opts?: TranscodeOptions): Promise<Buffer> {
  const fps = opts?.fps ?? CLIP_DEFAULT_FPS;
  const maxFrames = opts?.maxFrames ?? DEFAULT_MAX_FRAMES;
  const width = opts?.width ?? DEFAULT_WIDTH;
  const height = opts?.height ?? DEFAULT_HEIGHT;
  const scaleFilter = buildScaleFilter(width, height);

  const outputOptions = [
    '-r', String(fps),
    '-vframes', String(maxFrames),
    '-f', 'rawvideo',
    '-pix_fmt', 'rgb565le',
  ];
  if (opts?.maxDurationS != null) {
    outputOptions.push('-t', String(opts.maxDurationS));
  }

  const result = await callFfmpegProcess(videoUrl, {
    inputs: [{ file_path: videoUrl, options: ['-stream_loop', '1'] }],
    filter_complex: `[0:v]${scaleFilter}[out]`,
    outputs: [
      {
        file: 'video.bin',
        maps: ['[out]'],
        options: outputOptions,
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
async function producePreview(videoUrl: string, opts?: TranscodeOptions): Promise<Buffer> {
  const fps = opts?.fps ?? CLIP_DEFAULT_FPS;
  const maxFrames = opts?.maxFrames ?? DEFAULT_MAX_FRAMES;
  const width = opts?.width ?? DEFAULT_WIDTH;
  const height = opts?.height ?? DEFAULT_HEIGHT;
  const scaleFilter = buildScaleFilter(width, height);

  const outputOptions = [
    '-r', String(fps),
    '-vframes', String(maxFrames),
    '-c:v', 'libx264',
    '-crf', '23',
    '-an',
    '-movflags', '+faststart',
  ];
  if (opts?.maxDurationS != null) {
    outputOptions.push('-t', String(opts.maxDurationS));
  }

  const result = await callFfmpegProcess(videoUrl, {
    inputs: [{ file_path: videoUrl, options: ['-stream_loop', '1'] }],
    filter_complex: `[0:v]${scaleFilter}[out]`,
    outputs: [
      {
        file: 'preview.mp4',
        maps: ['[out]'],
        options: outputOptions,
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
 * Découpe le preview d'un clip, upload sur R2 et retourne la nouvelle URL de travail + durée.
 * Enregistre dans preview-working.mp4 pour ne pas écraser la vidéo de base (preview.mp4).
 */
export async function trimClipPreview(
  clipId: string,
  sourcePreviewUrl: string,
  startS: number,
  endS: number
): Promise<{ workingPreviewUrl: string; durationS: number }> {
  const buffer = await trimVideo(sourcePreviewUrl, startS, endS);
  const durationS = Math.max(0, endS - startS);
  const workingPreviewUrl = await uploadClipFile(
    clipId,
    'preview-working.mp4',
    buffer,
    'video/mp4'
  );
  return { workingPreviewUrl, durationS };
}

/**
 * Convertit uniquement le .mjpeg à partir d'un preview MP4 existant.
 * Utilisé quand on a previewUrl mais pas fileUrl (conversion manuelle).
 * Ne régénère pas le preview, garde l'existant.
 * @param opts - Optionnel : fps, maxFrames, maxDurationS, width, height depuis le clip
 */
export async function processClipFromPreviewUrl(
  clipId: string,
  previewUrl: string,
  opts?: TranscodeOptions
): Promise<
  | { fileUrl: string; sha256: string; sizeBytes: number }
  | ClipWorkerError
> {
  try {
    const mjpegBuffer = await transcodeToMjpeg(previewUrl, opts);
    const sha256 = createHash('sha256').update(mjpegBuffer).digest('hex');
    const sizeBytes = mjpegBuffer.length;
    const fileUrl = await uploadClipFile(
      clipId,
      'video.mjpeg',
      mjpegBuffer,
      'video/x-mjpeg'
    );
    return { fileUrl, sha256, sizeBytes };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

/**
 * Job worker : MP4 xAI → .mjpeg MJPEG + preview MP4 → upload R2.
 * Retourne fileUrl, previewUrl, sha256, sizeBytes ou { error }.
 * @param opts - Optionnel : fps, maxFrames, maxDurationS, width, height pour éviter la troncature
 */
export async function processClipFromVideoUrl(
  clipId: string,
  videoUrl: string,
  opts?: TranscodeOptions
): Promise<ClipWorkerResult | ClipWorkerError> {
  try {
    const [mjpegBuffer, previewBuffer] = await Promise.all([
      transcodeToMjpeg(videoUrl, opts),
      producePreview(videoUrl, opts),
    ]);

    const sha256 = createHash('sha256').update(mjpegBuffer).digest('hex');
    const sizeBytes = mjpegBuffer.length;

    const [fileUrl, previewUrl] = await Promise.all([
      uploadClipFile(clipId, 'video.mjpeg', mjpegBuffer, 'video/x-mjpeg'),
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
