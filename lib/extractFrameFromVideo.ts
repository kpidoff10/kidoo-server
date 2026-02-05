/**
 * Extrait une frame d'une vidéo (URL ou chemin) à l'index donné.
 * Utilise ffmpeg. Préfère ffmpeg-static (binaire inclus), sinon FFMPEG_PATH ou "ffmpeg" dans PATH.
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
function getFfmpegPath(): string {
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
 * @param videoInputUrl - URL (http/https) ou chemin du fichier vidéo
 * @param frameIndex - Index de la frame (0-based)
 */
export async function extractFrameAt(videoInputUrl: string, frameIndex: number): Promise<Buffer> {
  const ffmpegPath = getFfmpegPath();
  const tempDir = os.tmpdir();
  const outPath = path.join(tempDir, `kidoo-frame-${Date.now()}-${frameIndex}-${Math.random().toString(36).slice(2)}.png`);

  try {
    // select=eq(n\,N) : frame exacte N (échapper la virgule pour le shell)
    await execFileAsync(ffmpegPath, [
      '-i', videoInputUrl,
      '-vf', `select=eq(n\\,${frameIndex})`,
      '-vframes', '1',
      '-y',
      outPath,
    ], {
      timeout: 60000, // 60s max par frame
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
