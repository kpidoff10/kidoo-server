/**
 * Worker : génération MJPEG pour les EmotionVideos.
 *
 * Processus :
 * 1. Transcode le preview du clip source en MJPEG (toutes les frames)
 * 2. Parse les frames JPEG individuelles
 * 3. Réordonne/compose selon la timeline (intro + loop + exit)
 * 4. Produit un fichier MJPEG final uploadé sur R2
 */

import { createHash } from 'crypto';
import sharp from 'sharp';
import { prisma } from './prisma';
import { transcodeToMjpeg, downloadFile } from './clipWorker';
import type { TranscodeOptions } from './clipWorker';
import { uploadEmotionVideoFile } from './r2';
import type { TimelineFrame, TimelineRegion, TimelineArtifact } from '@/types/emotion-video';

const DEFAULT_WIDTH = 240;
const DEFAULT_HEIGHT = 280;
const JPEG_QUALITY = 93;
// Seuil RGB : tout pixel dont R, G et B sont en dessous est forcé à noir pur (0,0,0).
// Élimine le fond gris foncé de la vidéo source dans les rectangles de régions.
const BLACK_THRESHOLD = 25;

export interface EmotionVideoWorkerResult {
  binUrl: string;
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
 * Compose une frame composite (régions + artefacts sur fond noir) en JPEG.
 * Les images de régions/artefacts sont des PNGs pleine frame (240x280),
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

  // Forcer les pixels quasi-noirs à noir pur (0,0,0)
  // Élimine le fond gris foncé de la vidéo source visible dans les régions
  for (let i = 0; i < composited.length; i += ch) {
    if (
      composited[i] < BLACK_THRESHOLD &&
      composited[i + 1] < BLACK_THRESHOLD &&
      composited[i + 2] < BLACK_THRESHOLD
    ) {
      composited[i] = 0;
      composited[i + 1] = 0;
      composited[i + 2] = 0;
    }
  }

  // Encoder en JPEG
  return sharp(composited, {
    raw: { width: info.width, height: info.height, channels: ch },
  })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
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

    // Résolution dynamique depuis le clip source (fallback sur les defaults)
    const clipWidth = emotionVideo.sourceClip.width ?? DEFAULT_WIDTH;
    const clipHeight = emotionVideo.sourceClip.height ?? DEFAULT_HEIGHT;
    const clipFps = emotionVideo.sourceClip.fps ?? 10;
    // Éviter le fallback 60 du clipWorker : calculer maxFrames depuis durationS si frames manquant
    const clipFrames = emotionVideo.sourceClip.frames
      ?? (emotionVideo.sourceClip.durationS
        ? Math.ceil(emotionVideo.sourceClip.durationS * clipFps)
        : 600); // 60s à 10fps en secours si aucune métadonnée

    // Marge pour ne pas couper les dernières frames (arrondi, framerate variable)
    const maxFramesWithBuffer = clipFrames + 20;
    // maxDurationS : filet de sécurité si la vidéo est légèrement plus longue
    const maxDurationS = emotionVideo.sourceClip.durationS
      ? emotionVideo.sourceClip.durationS + 1
      : undefined;

    const transcodeOpts: TranscodeOptions = {
      fps: clipFps,
      maxFrames: maxFramesWithBuffer,
      maxDurationS,
      width: clipWidth,
      height: clipHeight,
    };

    // 3. Transcoder le preview du clip source en MJPEG → toutes les frames sources
    const sourceMjpegBuffer = await transcodeToMjpeg(effectivePreviewUrl, transcodeOpts);
    const sourceFrames = parseJpegFrames(sourceMjpegBuffer);

    if (sourceFrames.length === 0) {
      return { error: 'Aucune frame extraite du clip source' };
    }

    // 4. Construire le MJPEG final en suivant la timeline
    const outputFrames: Buffer[] = [];

    for (const frame of allTimelineFrames) {
      if (frame.type === 'full' && frame.sourceFrameIndex !== undefined) {
        // Frame complète : utiliser le JPEG source
        const srcIndex = frame.sourceFrameIndex;
        if (srcIndex >= 0 && srcIndex < sourceFrames.length) {
          outputFrames.push(sourceFrames[srcIndex]);
        } else {
          // Index hors limites : frame noire en fallback
          const blackFrame = await sharp({
            create: {
              width: clipWidth,
              height: clipHeight,
              channels: 3,
              background: { r: 0, g: 0, b: 0 },
            },
          })
            .jpeg({ quality: JPEG_QUALITY })
            .toBuffer();
          outputFrames.push(blackFrame);
        }
      } else if (frame.type === 'composite' && frame.regions) {
        // Frame composite : composer les régions avec Sharp
        const composited = await compositeFrameToJpeg(
          frame.regions,
          frame.artifacts || [],
          clipWidth,
          clipHeight,
        );
        outputFrames.push(composited);
      } else {
        // Fallback : frame noire
        const blackFrame = await sharp({
          create: {
            width: clipWidth,
            height: clipHeight,
            channels: 3,
            background: { r: 0, g: 0, b: 0 },
          },
        })
          .jpeg({ quality: JPEG_QUALITY })
          .toBuffer();
        outputFrames.push(blackFrame);
      }
    }

    // 5. Concaténer toutes les frames JPEG en un flux MJPEG
    const mjpegBuffer = Buffer.concat(outputFrames);

    // 6. Calculer SHA256 et taille
    const sha256 = createHash('sha256').update(mjpegBuffer).digest('hex');
    const sizeBytes = mjpegBuffer.length;

    // 7. Upload sur R2
    const binUrl = await uploadEmotionVideoFile(
      emotionVideoId,
      'video.mjpeg',
      mjpegBuffer,
      'video/x-motion-jpeg'
    );

    // 8. Calculer la durée
    const fps = emotionVideo.fps || 10;
    const durationS = totalFrames / fps;

    return { binUrl, sha256, sizeBytes, totalFrames, durationS };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}
