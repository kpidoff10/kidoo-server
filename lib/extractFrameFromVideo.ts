/**
 * Extrait une frame d'une vidéo (URL ou chemin) par seek temporel.
 * Utilise ffmpeg avec -ss (input seeking) pour correspondre au rendu navigateur.
 * Préfère ffmpeg-static (binaire inclus), sinon FFMPEG_PATH ou "ffmpeg" dans PATH.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execFileAsync = promisify(execFile);

const isWin = process.platform === 'win32';
const ffmpegBinName = isWin ? 'ffmpeg.exe' : 'ffmpeg';

/** Cherche le binaire dans node_modules/ffmpeg-static (par cwd ou depuis __dirname) */
function findFfmpegStaticInNodeModules(): string | null {
  const dirs = [process.cwd(), typeof __dirname !== 'undefined' ? __dirname : process.cwd()];
  for (const dir of dirs) {
    const p = path.join(dir, 'node_modules', 'ffmpeg-static', ffmpegBinName);
    if (fs.existsSync(p)) return p;
    const platformDir = path.join(dir, 'node_modules', 'ffmpeg-static', `${process.platform}-${process.arch}`, ffmpegBinName);
    if (fs.existsSync(platformDir)) return platformDir;
  }
  return null;
}

/** Chemin vers ffmpeg (ffmpeg-static si présent, sinon FFMPEG_PATH ou "ffmpeg") */
export function getFfmpegPath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('ffmpeg-static');
    const candidate = typeof mod === 'string' ? mod : (mod?.default ?? mod?.path);
    if (candidate && typeof candidate === 'string' && fs.existsSync(candidate)) return candidate;
  } catch {
    // ffmpeg-static non résolu (ex: bundle Next.js)
  }
  const fromNodeModules = findFfmpegStaticInNodeModules();
  if (fromNodeModules) return fromNodeModules;
  const envPath = process.env.FFMPEG_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;
  if (envPath) return envPath;
  return 'ffmpeg';
}

/**
 * Extrait la frame à l'index frameIndex (0-based) de la vidéo et retourne le buffer PNG.
 * Utilise le filtre select pour une extraction frame-accurate (correspond exactement à ce que
 * le navigateur affiche à currentTime = frameIndex/fps).
 * @param videoInputUrl - URL (http/https) ou chemin du fichier vidéo
 * @param frameIndex - Index de la frame (0-based)
 * @param fps - Framerate logique du clip (défaut: 10)
 */
export async function extractFrameAt(videoInputUrl: string, frameIndex: number, fps: number = 10): Promise<Buffer> {
  const ffmpegPath = getFfmpegPath();
  const tempDir = os.tmpdir();
  const outPath = path.join(tempDir, `kidoo-frame-${Date.now()}-${frameIndex}-${Math.random().toString(36).slice(2)}.png`);

  try {
    // -ss après -i = output seeking : frame-accurate (évite le seek par keyframe qui décalait les régions).
    // Seek temporel : frameIndex / fps = position en secondes (aligné avec le navigateur).
    const seekTime = frameIndex / fps;
    await execFileAsync(ffmpegPath, [
      '-i', videoInputUrl,
      '-ss', String(seekTime),
      '-vframes', '1',
      '-y',
      outPath,
    ], {
      timeout: 90000, // 90s (décodage depuis le début peut être lent sur vidéos longues)
      maxBuffer: 10 * 1024 * 1024, // 10 MB
    });

    const buffer = fs.readFileSync(outPath);
    return buffer;
  } catch (err: unknown) {
    const isEnonent = err && typeof err === 'object' && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT';
    if (isEnonent) {
      throw new Error(
        'ffmpeg introuvable. Installez le paquet : npm install ffmpeg-static. ' +
          'Ou installez ffmpeg sur le système et ajoutez-le au PATH, ou définissez la variable d\'environnement FFMPEG_PATH.'
      );
    }
    throw err;
  } finally {
    try {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    } catch {
      // ignore
    }
  }
}

/** Options pour l'encodage JPEG via ffmpeg (format compatible JPEGDEC sur ESP32) */
export interface EncodeImageToJpegOptions {
  rotate?: number;  // 90 = sens horaire (transpose=1)
  width?: number;
  height?: number;
}

// ffmpeg MJPEG : q:v 2–31 (2 = max qualité / gros fichiers, 31 = max compression).
// 8 = bon compromis qualité / taille pour garder le FPS sur l’ESP32.
const MJPEG_Q_V = 5;

/**
 * Encode une image (fichier) en JPEG via ffmpeg : pix_fmt yuvj420p, baseline.
 * Compatible avec JPEGDEC sur l'ESP32 (même format que clipWorker transcodeToMjpeg).
 */
export async function encodeImageToJpeg(
  inputImagePath: string,
  options?: EncodeImageToJpegOptions
): Promise<Buffer> {
  const ffmpegPath = getFfmpegPath();
  const tempDir = os.tmpdir();
  const outPath = path.join(tempDir, `kidoo-jpeg-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);

  try {
    const vfParts: string[] = [];
    if (options?.rotate === 90) {
      vfParts.push('transpose=1'); // 90° sens horaire
    }
    if (options?.width != null && options?.height != null) {
      vfParts.push(`scale=${options.width}:${options.height}`);
    }
    const args = [
      '-y',
      '-i', inputImagePath,
      ...(vfParts.length ? ['-vf', vfParts.join(',')] : []),
      '-pix_fmt', 'yuvj420p',
      '-c:v', 'mjpeg',
      '-q:v', String(MJPEG_Q_V),
      '-huffman', 'default',
      '-frames:v', '1',
      outPath,
    ];
    await execFileAsync(ffmpegPath, args, {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return fs.readFileSync(outPath);
  } finally {
    try {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    } catch {
      // ignore
    }
  }
}

/**
 * Encode un buffer image (PNG ou JPEG) en JPEG via ffmpeg.
 * Écrit le buffer dans un fichier temporaire puis appelle encodeImageToJpeg.
 */
export async function encodeImageBufferToJpeg(
  imageBuffer: Buffer,
  format: 'png' | 'jpeg',
  options?: EncodeImageToJpegOptions
): Promise<Buffer> {
  const tempDir = os.tmpdir();
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const inputPath = path.join(tempDir, `kidoo-in-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  try {
    fs.writeFileSync(inputPath, imageBuffer);
    return await encodeImageToJpeg(inputPath, options);
  } finally {
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    } catch {
      // ignore
    }
  }
}

/**
 * Génère une frame JPEG noire (yuvj420p) via ffmpeg.
 * Compatible JPEGDEC sur l'ESP32.
 */
export async function createBlackJpeg(width: number, height: number): Promise<Buffer> {
  const ffmpegPath = getFfmpegPath();
  const tempDir = os.tmpdir();
  const outPath = path.join(tempDir, `kidoo-black-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);

  try {
    await execFileAsync(ffmpegPath, [
      '-y',
      '-f', 'lavfi',
      '-i', `color=c=black:s=${width}x${height}`,
      '-t', '0.001',
      '-pix_fmt', 'yuvj420p',
      '-c:v', 'mjpeg',
      '-q:v', String(MJPEG_Q_V),
      '-frames:v', '1',
      outPath,
    ], {
      timeout: 10000,
      maxBuffer: 2 * 1024 * 1024,
    });
    return fs.readFileSync(outPath);
  } finally {
    try {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    } catch {
      // ignore
    }
  }
}
