/**
 * Génère une image masque pour une région : fond noir (taille vidéo) + rectangle blanc (région).
 * Utilisé pour les clip face regions (frame N, région leftEye/rightEye/mouth).
 */

import sharp from 'sharp';

export interface RegionShape {
  /** Coordonnées normalisées 0-1 */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Coins arrondis ou carrés */
  cornerStyle?: 'rounded' | 'square';
}

/**
 * Génère un buffer PNG : image (width x height) fond noir avec la région en blanc.
 * x, y, w, h sont en 0-1 (normalisés).
 */
export async function createRegionMaskPng(
  width: number,
  height: number,
  region: RegionShape
): Promise<Buffer> {
  const xPx = Math.round(region.x * width);
  const yPx = Math.round(region.y * height);
  let wPx = Math.round(region.w * width);
  let hPx = Math.round(region.h * height);

  // Clamp pour rester dans l'image
  if (xPx + wPx > width) wPx = width - xPx;
  if (yPx + hPx > height) hPx = height - yPx;
  if (wPx <= 0 || hPx <= 0) {
    return sharp({
      create: {
        width: Math.max(1, width),
        height: Math.max(1, height),
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
  }

  const radius = region.cornerStyle === 'rounded' ? Math.min(wPx, hPx) / 4 : 0;
  const rx = Math.min(radius, wPx / 2);
  const ry = Math.min(radius, hPx / 2);

  const rectSvg =
    rx > 0
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="${wPx}" height="${hPx}"><rect x="0" y="0" width="${wPx}" height="${hPx}" rx="${rx}" ry="${ry}" fill="white"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="${wPx}" height="${hPx}"><rect x="0" y="0" width="${wPx}" height="${hPx}" fill="white"/></svg>`;

  const whiteRect = Buffer.from(rectSvg);

  const mask = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([
      {
        input: whiteRect,
        left: Math.max(0, xPx),
        top: Math.max(0, yPx),
      },
    ])
    .png()
    .toBuffer();

  return mask;
}

/**
 * Extrait le contenu d'une région depuis une image (frame vidéo).
 * Retourne un PNG recadré (rectangle de la région).
 * Coordonnées normalisées 0-1.
 */
export async function cropRegionFromImage(
  frameBuffer: Buffer,
  frameWidth: number,
  frameHeight: number,
  region: RegionShape
): Promise<Buffer> {
  let xPx = Math.round(region.x * frameWidth);
  let yPx = Math.round(region.y * frameHeight);
  let wPx = Math.round(region.w * frameWidth);
  let hPx = Math.round(region.h * frameHeight);

  xPx = Math.max(0, Math.min(xPx, frameWidth - 1));
  yPx = Math.max(0, Math.min(yPx, frameHeight - 1));
  if (xPx + wPx > frameWidth) wPx = frameWidth - xPx;
  if (yPx + hPx > frameHeight) hPx = frameHeight - yPx;
  if (wPx <= 0 || hPx <= 0) {
    return sharp(frameBuffer).extract({ left: 0, top: 0, width: 1, height: 1 }).png().toBuffer();
  }

  return sharp(frameBuffer)
    .extract({ left: xPx, top: yPx, width: wPx, height: hPx })
    .png()
    .toBuffer();
}

/**
 * Extrait le contenu d'une région dans une image pleine frame (même taille que la vidéo)
 * avec fond transparent : seul le rectangle de la région contient les pixels de la vidéo,
 * le reste est en alpha 0. Idéal pour superposer plusieurs régions.
 * Coordonnées normalisées 0-1.
 */
export async function extractRegionWithTransparentBackground(
  frameBuffer: Buffer,
  frameWidth: number,
  frameHeight: number,
  region: RegionShape
): Promise<Buffer> {
  let xPx = Math.round(region.x * frameWidth);
  let yPx = Math.round(region.y * frameHeight);
  let wPx = Math.round(region.w * frameWidth);
  let hPx = Math.round(region.h * frameHeight);

  xPx = Math.max(0, Math.min(xPx, frameWidth - 1));
  yPx = Math.max(0, Math.min(yPx, frameHeight - 1));
  if (xPx + wPx > frameWidth) wPx = frameWidth - xPx;
  if (yPx + hPx > frameHeight) hPx = frameHeight - yPx;
  if (wPx <= 0 || hPx <= 0) {
    return sharp({
      create: {
        width: frameWidth,
        height: frameHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();
  }

  const cropBuffer = await sharp(frameBuffer)
    .extract({ left: xPx, top: yPx, width: wPx, height: hPx })
    .ensureAlpha()
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: frameWidth,
      height: frameHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: cropBuffer, left: xPx, top: yPx }])
    .png()
    .toBuffer();
}
