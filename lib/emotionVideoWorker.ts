/**
 * Worker : génération MJPEG pour les EmotionVideos.
 *
 * On part uniquement des frames de la timeline (intro + loop + exit) :
 * - type "full" + imageUrl : image extraite (timeline) → utilisée telle quelle
 * - type "full" sans imageUrl : extraction de la frame à sourceFrameIndex depuis la vidéo (uniquement les indices référencés)
 * - type "composite" : composition des régions/artefacts (images extraites)
 * Résolution de sortie : 280x240 (mode normal, pas de zoom).
 */

import { createHash } from 'crypto';
import sharp from 'sharp';
import { prisma } from './prisma';
import { downloadFile } from './clipWorker';
import {
  extractFrameAt,
  encodeImageBufferToJpeg,
  createBlackJpeg,
} from './extractFrameFromVideo';
import { uploadEmotionVideoFile } from './r2';
import type { TimelineFrame, TimelineRegion, TimelineArtifact } from '@/types/emotion-video';

// Dimensions landscape pour ESP32 (après rotation 90°) — mode normal, pas de zoom
const DEFAULT_WIDTH = 280;
const DEFAULT_HEIGHT = 240;

/** Détecte le format d'une image à partir des magic bytes (pour encodage ffmpeg). */
function detectImageFormat(buffer: Buffer): 'png' | 'jpeg' {
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png';
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpeg';
  return 'jpeg';
}

export interface EmotionVideoWorkerResult {
  binUrl: string;
  idxUrl: string;  // URL du fichier .idx pour l'ESP32
  sha256: string;
  sizeBytes: number;
  totalFrames: number;
  durationS: number;
}

export interface EmotionVideoWorkerError {
  error: string;
}

/**
 * Parse un buffer MJPEG en frames JPEG individuelles.
 * Chaque frame est délimitée par SOI (0xFFD8) et EOI (0xFFD9).
 */
export function parseJpegFrames(mjpegBuffer: Buffer): Buffer[] {
  const frames: Buffer[] = [];
  let i = 0;

  while (i < mjpegBuffer.length - 1) {
    // Chercher SOI (0xFF 0xD8)
    if (mjpegBuffer[i] === 0xff && mjpegBuffer[i + 1] === 0xd8) {
      const start = i;
      i += 2;
      // Chercher EOI (0xFF 0xD9)
      while (i < mjpegBuffer.length - 1) {
        if (mjpegBuffer[i] === 0xff && mjpegBuffer[i + 1] === 0xd9) {
          frames.push(mjpegBuffer.subarray(start, i + 2));
          i += 2;
          break;
        }
        i++;
      }
    } else {
      i++;
    }
  }

  return frames;
}

/**
 * Génère un fichier .idx contenant les offsets et tailles de chaque frame JPEG
 * dans un buffer MJPEG. Format binaire little-endian :
 * - [uint32] nombre de frames
 * - Pour chaque frame : [uint32] offset, [uint32] size
 */
export function generateFrameIndex(mjpegBuffer: Buffer): Buffer {
  interface FrameOffset {
    offset: number;
    size: number;
  }

  const frameOffsets: FrameOffset[] = [];
  let i = 0;

  while (i < mjpegBuffer.length - 1) {
    // Chercher SOI (0xFF 0xD8)
    if (mjpegBuffer[i] === 0xff && mjpegBuffer[i + 1] === 0xd8) {
      const start = i;
      i += 2;
      // Chercher EOI (0xFF 0xD9)
      while (i < mjpegBuffer.length - 1) {
        if (mjpegBuffer[i] === 0xff && mjpegBuffer[i + 1] === 0xd9) {
          const end = i + 2;
          frameOffsets.push({ offset: start, size: end - start });
          i = end;
          break;
        }
        i++;
      }
    } else {
      i++;
    }
  }

  // Créer le buffer d'index : 4 bytes pour le count + 8 bytes par frame
  const indexBuffer = Buffer.alloc(4 + frameOffsets.length * 8);

  // Écrire le nombre de frames (uint32 little-endian)
  indexBuffer.writeUInt32LE(frameOffsets.length, 0);

  // Écrire chaque offset et size
  let pos = 4;
  for (const frame of frameOffsets) {
    indexBuffer.writeUInt32LE(frame.offset, pos);
    indexBuffer.writeUInt32LE(frame.size, pos + 4);
    pos += 8;
  }

  return indexBuffer;
}

/**
 * Compose une frame composite (régions + artefacts sur fond noir) en JPEG.
 * Les images de régions/artefacts sont des PNGs pleine frame (280x240 landscape),
 * fond transparent, contenu déjà positionné à la bonne coordonnée.
 * On les superpose toutes à (0,0) sur un fond noir.
 */
async function compositeFrameToJpeg(
  regions: { leftEye?: TimelineRegion; rightEye?: TimelineRegion; mouth?: TimelineRegion },
  artifacts: TimelineArtifact[],
  width: number,
  height: number,
): Promise<Buffer> {
  // Collecter toutes les URLs d'images à télécharger
  const imageUrls: string[] = [];

  for (const region of [regions.leftEye, regions.rightEye, regions.mouth]) {
    if (region?.imageUrl) imageUrls.push(region.imageUrl);
  }
  for (const artifact of artifacts) {
    if (artifact?.imageUrl) imageUrls.push(artifact.imageUrl);
  }

  // Télécharger toutes les images en parallèle
  const pngBuffers = await Promise.all(imageUrls.map((url) => downloadFile(url)));

  // Redimensionner si nécessaire : les images générées récemment sont déjà à la résolution cible.
  // Pour les anciennes images (résolution native), on resize avec fit contain.
  const resizedBuffers = await Promise.all(
    pngBuffers.map(async (png) => {
      const meta = await sharp(png).metadata();
      if (meta.width === width && meta.height === height) return png;
      return sharp(png)
        .resize(width, height, {
          fit: 'contain',
          position: 'center',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
    })
  );

  // Toutes les images sont pleine frame avec fond transparent,
  // le contenu est déjà à la bonne position → composite à (0,0)
  const composites: sharp.OverlayOptions[] = resizedBuffers.map((png) => ({
    input: png,
    left: 0,
    top: 0,
  }));

  // Créer l'image fond noir + composites → forcer en 3 canaux RGB (pas RGBA)
  const { data: composited, info } = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite(composites)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ch = info.channels; // doit être 3 après removeAlpha()

  // Note: Le forçage des noirs a été supprimé car il créait des halos autour des contours blancs.
  // Sharp gère maintenant la composition naturellement avec antialiasing préservé.

  // Encoder en PNG puis en JPEG via ffmpeg (yuvj420p, compatible JPEGDEC sur ESP32)
  const pngBuffer = await sharp(composited, {
    raw: { width: info.width, height: info.height, channels: ch },
  })
    .png()
    .toBuffer();
  return encodeImageBufferToJpeg(pngBuffer, 'png');
}

/**
 * Génère le fichier MJPEG pour une EmotionVideo.
 * Retourne les métadonnées (URL, hash, taille) ou une erreur.
 */
export async function generateEmotionVideoMjpeg(
  emotionVideoId: string
): Promise<EmotionVideoWorkerResult | EmotionVideoWorkerError> {
  try {
    // 1. Récupérer l'EmotionVideo avec le clip source
    const emotionVideo = await prisma.emotionVideo.findUnique({
      where: { id: emotionVideoId },
      include: {
        sourceClip: {
          select: {
            id: true,
            previewUrl: true,
            workingPreviewUrl: true,
            fps: true,
            width: true,
            height: true,
            frames: true,
            durationS: true,
          },
        },
      },
    });

    if (!emotionVideo) {
      return { error: 'EmotionVideo non trouvée' };
    }

    const effectivePreviewUrl =
      emotionVideo.sourceClip?.workingPreviewUrl ?? emotionVideo.sourceClip?.previewUrl;
    if (!effectivePreviewUrl) {
      return { error: 'Le clip source n\'a pas de preview URL' };
    }

    // 2. Extraire les 3 timelines
    const introTimeline = Array.isArray(emotionVideo.introTimeline)
      ? (emotionVideo.introTimeline as unknown as TimelineFrame[])
      : [];
    const loopTimeline = Array.isArray(emotionVideo.loopTimeline)
      ? (emotionVideo.loopTimeline as unknown as TimelineFrame[])
      : [];
    const exitTimeline = Array.isArray(emotionVideo.exitTimeline)
      ? (emotionVideo.exitTimeline as unknown as TimelineFrame[])
      : [];

    const allTimelineFrames = [...introTimeline, ...loopTimeline, ...exitTimeline];
    const totalFrames = allTimelineFrames.length;

    if (totalFrames === 0) {
      return { error: 'Aucune frame dans les timelines' };
    }

    // Résolution de sortie : toujours 280x240 (mode normal, pas de zoom)
    const clipWidth = DEFAULT_WIDTH;
    const clipHeight = DEFAULT_HEIGHT;
    const clipFps = emotionVideo.sourceClip.fps ?? 10;

    // Pour les frames "full" sans imageUrl : extraire uniquement les indices référencés par la timeline
    const fullFrameIndicesNeeded = new Set<number>();
    for (const f of allTimelineFrames) {
      if (f.type === 'full' && !f.imageUrl && f.sourceFrameIndex != null) {
        fullFrameIndicesNeeded.add(f.sourceFrameIndex);
      }
    }
    const sourceFrameMap = new Map<number, Buffer>();
    if (fullFrameIndicesNeeded.size > 0) {
      for (const idx of fullFrameIndicesNeeded) {
        try {
          const pngBuffer = await extractFrameAt(effectivePreviewUrl, idx, clipFps);
          // Rotation 90° sens horaire + resize, encodage JPEG via ffmpeg (yuvj420p, compatible JPEGDEC)
          const jpegBuffer = await encodeImageBufferToJpeg(pngBuffer, 'png', {
            rotate: 90,
            width: clipWidth,
            height: clipHeight,
          });
          sourceFrameMap.set(idx, jpegBuffer);
        } catch (err) {
          console.warn(`[emotionVideoWorker] extractFrameAt(${idx}) failed:`, err);
        }
      }
    }

    // Helper : frame noire aux dimensions du clip (ffmpeg, compatible JPEGDEC)
    const blackFrame = (): Promise<Buffer> => createBlackJpeg(clipWidth, clipHeight);

    // Construire le MJPEG final uniquement à partir des frames de la timeline
    const outputFrames: Buffer[] = [];

    for (const frame of allTimelineFrames) {
      if (frame.type === 'full') {
        // Frame complète : priorité à l'image extraite (timeline), sinon vidéo source
        if (frame.imageUrl) {
          const imgBuffer = await downloadFile(frame.imageUrl);
          const format = detectImageFormat(imgBuffer);
          const jpegBuffer = await encodeImageBufferToJpeg(imgBuffer, format, {
            width: clipWidth,
            height: clipHeight,
          });
          outputFrames.push(jpegBuffer);
        } else if (frame.sourceFrameIndex !== undefined) {
          const srcBuf = sourceFrameMap.get(frame.sourceFrameIndex);
          if (srcBuf) {
            outputFrames.push(srcBuf);
          } else {
            outputFrames.push(await blackFrame());
          }
        } else {
          outputFrames.push(await blackFrame());
        }
      } else if (frame.type === 'composite' && frame.regions) {
        // Frame composite : composer les régions (images extraites)
        const composited = await compositeFrameToJpeg(
          frame.regions,
          frame.artifacts || [],
          clipWidth,
          clipHeight,
        );
        outputFrames.push(composited);
      } else {
        outputFrames.push(await blackFrame());
      }
    }

    // 5. Concaténer toutes les frames JPEG en un flux MJPEG
    const mjpegBuffer = Buffer.concat(outputFrames);

    // 6. Générer le fichier d'index .idx
    const indexBuffer = generateFrameIndex(mjpegBuffer);

    // 7. Calculer SHA256 et taille
    const sha256 = createHash('sha256').update(mjpegBuffer).digest('hex');
    const sizeBytes = mjpegBuffer.length;

    // 8. Upload sur R2 (vidéo + index)
    const [binUrl, idxUrl] = await Promise.all([
      uploadEmotionVideoFile(
        emotionVideoId,
        'video.mjpeg',
        mjpegBuffer,
        'video/x-motion-jpeg'
      ),
      uploadEmotionVideoFile(
        emotionVideoId,
        'video.idx',
        indexBuffer,
        'application/octet-stream'
      ),
    ]);

    // 9. Calculer la durée
    const fps = emotionVideo.fps || 10;
    const durationS = totalFrames / fps;

    return { binUrl, idxUrl, sha256, sizeBytes, totalFrames, durationS };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}
