/**
 * Extrait les métadonnées (durée, fps, dimensions) d'une vidéo via ffmpeg.
 * Utilise ffmpeg (ffmpeg-static) car ffprobe n'est pas inclus dans ffmpeg-static.
 * Parse la sortie stderr de ffmpeg -i pour extraire Duration et Stream.
 */

import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const isWin = process.platform === 'win32';
const ffmpegBinName = isWin ? 'ffmpeg.exe' : 'ffmpeg';

function findFfmpegStatic(): string | null {
  const dirs = [process.cwd(), typeof __dirname !== 'undefined' ? __dirname : process.cwd()];
  for (const dir of dirs) {
    const p = path.join(dir, 'node_modules', 'ffmpeg-static', ffmpegBinName);
    if (fs.existsSync(p)) return p;
    const platformDir = path.join(dir, 'node_modules', 'ffmpeg-static', `${process.platform}-${process.arch}`, ffmpegBinName);
    if (fs.existsSync(platformDir)) return platformDir;
  }
  return null;
}

function getFfmpegPath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('ffmpeg-static');
    const candidate = typeof mod === 'string' ? mod : (mod?.default ?? mod?.path);
    if (candidate && typeof candidate === 'string' && fs.existsSync(candidate)) return candidate;
  } catch {
    // ignore
  }
  const fromStatic = findFfmpegStatic();
  if (fromStatic) return fromStatic;
  const envPath = process.env.FFMPEG_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;
  return envPath ?? 'ffmpeg';
}

export interface VideoMetadata {
  durationS: number;
  fps: number;
  width?: number;
  height?: number;
}

/** Parse "Duration: 00:01:23.45" en secondes */
function parseDuration(stderr: string): number {
  const m = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}[.,]\d+)/);
  if (!m) return 0;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const s = parseFloat(m[3].replace(',', '.'));
  if (!Number.isFinite(h + min + s)) return 0;
  return h * 3600 + min * 60 + s;
}

/** Parse "480x640" et "30 fps" / "29.97 fps" dans la ligne Stream */
function parseStream(stderr: string): { width?: number; height?: number; fps?: number } {
  const result: { width?: number; height?: number; fps?: number } = {};
  const resMatch = stderr.match(/(\d{2,5})x(\d{2,5})/);
  if (resMatch) {
    result.width = parseInt(resMatch[1], 10);
    result.height = parseInt(resMatch[2], 10);
  }
  const fpsMatch = stderr.match(/(\d+(?:\.\d+)?)\s*fps/);
  if (fpsMatch) {
    result.fps = parseFloat(fpsMatch[1]);
  }
  return result;
}

/**
 * Extrait les métadonnées d'une vidéo via ffmpeg -i (parse stderr).
 * ffmpeg -f null - échoue (exit 1) car pas de sortie, mais stderr contient Duration et Stream.
 */
export async function getVideoMetadata(
  inputPathOrUrl: string,
  defaultFps: number = 10
): Promise<VideoMetadata> {
  const ffmpegPath = getFfmpegPath();

  return new Promise((resolve) => {
    execFile(
      ffmpegPath,
      ['-i', inputPathOrUrl, '-f', 'null', '-'],
      { timeout: 15000, maxBuffer: 2 * 1024 * 1024 },
      (err, _stdout, stderr) => {
        const output = (stderr || '') + (err?.message || '');
        const durationS = parseDuration(output);
        const stream = parseStream(output);
        const fps = stream.fps && stream.fps > 0 ? stream.fps : defaultFps;
        resolve({
          durationS,
          fps,
          width: stream.width,
          height: stream.height,
        });
      }
    );
  });
}

/**
 * Version qui accepte un buffer : écrit le buffer dans un fichier temporaire,
 * appelle getVideoMetadata, puis supprime le fichier.
 */
export async function getVideoMetadataFromBuffer(
  buffer: Buffer,
  defaultFps: number = 10
): Promise<VideoMetadata> {
  const tempDir = os.tmpdir();
  const tempPath = path.join(tempDir, `kidoo-video-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
  try {
    fs.writeFileSync(tempPath, buffer);
    return await getVideoMetadata(tempPath, defaultFps);
  } finally {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {
      // ignore
    }
  }
}
