/**
 * Génération du format .anim pour l'ESP32 (palette 8-bit + RLE horizontal).
 * Structure binaire little-endian, compatible avec le décodeur C++ sur l'ESP32.
 *
 * Header 14 octets : magic "ANIM", version 1, num_frames, width 240, height 280, palette_size, reserved.
 * Palette : palette_size × 2 octets (RGB565 little-endian).
 * Par frame : uint32 rle_data_size puis uint8[] rle_data (RLE horizontal, 240 px/ligne).
 */

const ANIM_MAGIC = 'ANIM';
const ANIM_VERSION = 1;
const ANIM_HEADER_SIZE = 14;

/** Dimensions cibles .anim (écran ESP32 240×280) */
export const ANIM_WIDTH = 240;
export const ANIM_HEIGHT = 280;

/** Convertit RGB (0-255) en RGB565 (big-endian pour écriture little-endian dans le fichier). */
function rgbToRgb565(r: number, g: number, b: number): number {
  const r5 = Math.min(31, (r >> 3) & 31);
  const g6 = Math.min(63, (g >> 2) & 63);
  const b5 = Math.min(31, (b >> 3) & 31);
  return (r5 << 11) | (g6 << 5) | b5;
}

/**
 * Palette fixe 256 couleurs (3-3-2 bits R-G-B). Index 0 = noir (transparent sur l'ESP32).
 * Retourne les couleurs en RGB565 pour écriture dans le fichier.
 */
function buildFixedPaletteRgb565(): number[] {
  const palette: number[] = [];
  for (let i = 0; i < 256; i++) {
    const r = (i & 7) * (255 / 7);
    const g = ((i >> 3) & 7) * (255 / 7);
    const b = (i >> 6) * (255 / 3);
    palette.push(rgbToRgb565(r, g, b));
  }
  return palette;
}

/** Même palette en RGB 0-255 pour recherche de plus proche couleur. */
function buildFixedPaletteRgb(paletteRgb565: number[]): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const c of paletteRgb565) {
    const r = ((c >> 11) & 31) * (255 / 31);
    const g = ((c >> 5) & 63) * (255 / 63);
    const b = (c & 31) * (255 / 31);
    out.push([r, g, b]);
  }
  return out;
}

/** Échantillonne des pixels RGB depuis les frames (240×280 après transpose) pour génération de palette. */
function samplePixelsFromFrames(
  rgbFrames280x240: Buffer[],
  transposed: Buffer,
  step: number
): number[][] {
  const w = ANIM_WIDTH;
  const h = ANIM_HEIGHT;
  const pixels: number[][] = [];
  for (let fi = 0; fi < rgbFrames280x240.length; fi += Math.max(1, Math.floor(rgbFrames280x240.length / 30))) {
    resize280x240To240x280Center(rgbFrames280x240[fi]).copy(transposed);
    for (let i = 0; i < w * h * 3; i += step * 3) {
      const r = transposed[i];
      const g = transposed[i + 1];
      const b = transposed[i + 2];
      const lum = (r + g + b) / 3;
      if (lum < DITHER_BLACK_LUMINANCE_THRESHOLD) continue;
      pixels.push([r, g, b]);
    }
  }
  return pixels;
}

/**
 * Median cut : découpe récursive par canal de plus grande plage, puis moyenne par boîte.
 * Retourne au plus maxColors couleurs (sans compter le noir réservé à l'index 0).
 */
function medianCut(pixels: number[][], maxColors: number): [number, number, number][] {
  if (pixels.length === 0) return [];
  const buckets: number[][] = pixels.map((p) => [...p]);

  const sortByChannel = (indices: number[], channel: number) => {
    indices.sort((a, b) => {
      const va = buckets[a][channel];
      const vb = buckets[b][channel];
      return va - vb;
    });
  };

  type Box = { indices: number[] };
  let boxes: Box[] = [{ indices: buckets.map((_, i) => i) }];

  while (boxes.length < maxColors) {
    let bestBoxIdx = -1;
    let bestSpread = -1;
    let bestChannel = 0;
    for (let bi = 0; bi < boxes.length; bi++) {
      const box = boxes[bi];
      if (box.indices.length < 2) continue;
      for (let ch = 0; ch < 3; ch++) {
        let min = 255, max = 0;
        for (const idx of box.indices) {
          const v = buckets[idx][ch];
          if (v < min) min = v;
          if (v > max) max = v;
        }
        const spread = max - min;
        if (spread > bestSpread) {
          bestSpread = spread;
          bestBoxIdx = bi;
          bestChannel = ch;
        }
      }
    }
    if (bestBoxIdx < 0 || bestSpread <= 0) break;

    const box = boxes[bestBoxIdx];
    sortByChannel(box.indices, bestChannel);
    const mid = Math.floor(box.indices.length / 2);
    const left: Box = { indices: box.indices.slice(0, mid) };
    const right: Box = { indices: box.indices.slice(mid) };
    boxes = boxes.slice(0, bestBoxIdx).concat([left, right], boxes.slice(bestBoxIdx + 1));
  }

  const colors: [number, number, number][] = [];
  for (const box of boxes) {
    if (box.indices.length === 0) continue;
    let r = 0, g = 0, b = 0;
    for (const idx of box.indices) {
      r += buckets[idx][0];
      g += buckets[idx][1];
      b += buckets[idx][2];
    }
    const n = box.indices.length;
    colors.push([Math.round(r / n), Math.round(g / n), Math.round(b / n)]);
  }
  return colors;
}

/** Facteur de renforcement de la saturation des couleurs de la palette (1 = inchangé, 1.25 = plus vif). */
const PALETTE_SATURATION_BOOST = 1.22;

/** Force du renforcement des contours (0 = désactivé, évite tout grain résiduel). */
const SHARPEN_AMOUNT = 0;

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
    if (h < 0) h += 360;
  }
  return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) {
    r = c; g = x; b = 0;
  } else if (h < 120) {
    r = x; g = c; b = 0;
  } else if (h < 180) {
    r = 0; g = c; b = x;
  } else if (h < 240) {
    r = 0; g = x; b = c;
  } else if (h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** Renforce la saturation des couleurs de la palette (sauf index 0 = noir) pour des couleurs plus vives. */
function boostSaturationPalette(paletteRgb: [number, number, number][], factor: number): void {
  for (let i = 1; i < paletteRgb.length; i++) {
    const [r, g, b] = paletteRgb[i];
    const { h, s, v } = rgbToHsv(r, g, b);
    const s2 = Math.min(1, s * factor);
    const [r2, g2, b2] = hsvToRgb(h, s2, v);
    paletteRgb[i][0] = Math.max(0, Math.min(255, r2));
    paletteRgb[i][1] = Math.max(0, Math.min(255, g2));
    paletteRgb[i][2] = Math.max(0, Math.min(255, b2));
  }
}

/**
 * Renforcement des contours (unsharp) sur le buffer RGB 240×280×3 en place.
 * Améliore la netteté perçue avant quantification.
 */
function sharpenRgbBuffer(rgb: Buffer): void {
  const w = ANIM_WIDTH;
  const h = ANIM_HEIGHT;
  const tmp = Buffer.from(rgb);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 3;
      const c = (dy: number, dx: number) => (y + dy) * w * 3 + (x + dx) * 3;
      for (let ch = 0; ch < 3; ch++) {
        const centerVal = tmp[i + ch];
        const blur =
          (centerVal * 4 +
            tmp[c(-1, 0) + ch] +
            tmp[c(1, 0) + ch] +
            tmp[c(0, -1) + ch] +
            tmp[c(0, 1) + ch]) /
          8;
        const sharp = centerVal + SHARPEN_AMOUNT * (centerVal - blur);
        rgb[i + ch] = Math.max(0, Math.min(255, Math.round(sharp)));
      }
    }
  }
}

/**
 * Génère une palette 256 couleurs adaptée au contenu des frames.
 * Index 0 = noir (réservé). Les 255 autres couleurs viennent d'un median cut, puis renforcement de saturation.
 */
function buildCustomPaletteFromFrames(rgbFrames280x240: Buffer[]): {
  paletteRgb565: number[];
  paletteRgb: [number, number, number][];
} {
  const transposed = Buffer.alloc(ANIM_WIDTH * ANIM_HEIGHT * 3);
  const pixels = samplePixelsFromFrames(rgbFrames280x240, transposed, 4);
  const customColors = medianCut(pixels, 255);
  const paletteRgb: [number, number, number][] = [[0, 0, 0]];
  for (const [r, g, b] of customColors) {
    paletteRgb.push([r, g, b]);
  }
  while (paletteRgb.length < 256) {
    paletteRgb.push([0, 0, 0]);
  }
  boostSaturationPalette(paletteRgb, PALETTE_SATURATION_BOOST);
  const paletteRgb565 = paletteRgb.map(([r, g, b]) => rgbToRgb565(r, g, b));
  return { paletteRgb565, paletteRgb };
}

/** Distance au carré entre (r,g,b) et une couleur palette (évite sqrt). */
function colorDistSq(r: number, g: number, b: number, pr: number, pg: number, pb: number): number {
  return (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
}

/** Index de la couleur de palette la plus proche (meilleure fidélité que 3-3-2 direct). */
function nearestPaletteIndex(r: number, g: number, b: number, paletteRgb: [number, number, number][]): number {
  let best = 0;
  let bestD = colorDistSq(r, g, b, paletteRgb[0][0], paletteRgb[0][1], paletteRgb[0][2]);
  for (let i = 1; i < paletteRgb.length; i++) {
    const d = colorDistSq(r, g, b, paletteRgb[i][0], paletteRgb[i][1], paletteRgb[i][2]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

const SRC_ANIM_W = 280;
const SRC_ANIM_H = 240;

/** Échantillon bilinéaire dans un buffer RGB (row-major, 3 bytes/pixel). */
function sampleBilinear(rgb: Buffer, w: number, h: number, x: number, y: number): [number, number, number] {
  const x0 = Math.max(0, Math.min(w - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(h - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(w - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(h - 1, y0 + 1));
  const fx = x - x0;
  const fy = y - y0;
  const i = (i: number, j: number) => ((j * w + i) * 3);
  const r =
    rgb[i(x0, y0)] * (1 - fx) * (1 - fy) +
    rgb[i(x1, y0)] * fx * (1 - fy) +
    rgb[i(x0, y1)] * (1 - fx) * fy +
    rgb[i(x1, y1)] * fx * fy;
  const g =
    rgb[i(x0, y0) + 1] * (1 - fx) * (1 - fy) +
    rgb[i(x1, y0) + 1] * fx * (1 - fy) +
    rgb[i(x0, y1) + 1] * (1 - fx) * fy +
    rgb[i(x1, y1) + 1] * fx * fy;
  const b =
    rgb[i(x0, y0) + 2] * (1 - fx) * (1 - fy) +
    rgb[i(x1, y0) + 2] * fx * (1 - fy) +
    rgb[i(x0, y1) + 2] * (1 - fx) * fy +
    rgb[i(x1, y1) + 2] * fx * fy;
  return [Math.round(r), Math.round(g), Math.round(b)];
}

/**
 * Redimensionne et centre l'image 280×240 dans 240×280 (format .anim).
 * "Cover" : scale pour remplir 240×280 en gardant le ratio, puis recadrage centré.
 * Pas d'offset ni de bandes noires : l'image remplit tout le cadre et est centrée.
 */
function resize280x240To240x280Center(rgbSource: Buffer): Buffer {
  const out = Buffer.alloc(ANIM_WIDTH * ANIM_HEIGHT * 3);
  const scale = Math.max(ANIM_WIDTH / SRC_ANIM_W, ANIM_HEIGHT / SRC_ANIM_H);
  const scaledW = Math.round(SRC_ANIM_W * scale);
  const scaledH = Math.round(SRC_ANIM_H * scale);
  const cropX = Math.max(0, Math.floor((scaledW - ANIM_WIDTH) / 2));
  const cropY = Math.max(0, Math.floor((scaledH - ANIM_HEIGHT) / 2));
  for (let y = 0; y < ANIM_HEIGHT; y++) {
    for (let x = 0; x < ANIM_WIDTH; x++) {
      const srcX = (x + cropX) / scale;
      const srcY = (y + cropY) / scale;
      const [r, g, b] = sampleBilinear(rgbSource, SRC_ANIM_W, SRC_ANIM_H, srcX, srcY);
      const idx = (y * ANIM_WIDTH + x) * 3;
      out[idx] = Math.max(0, Math.min(255, r));
      out[idx + 1] = Math.max(0, Math.min(255, g));
      out[idx + 2] = Math.max(0, Math.min(255, b));
    }
  }
  return out;
}

/** Seuil de luminance en dessous duquel on force le noir (index 0) pour éviter le bruit coloré du dithering sur fond noir. */
const DITHER_BLACK_LUMINANCE_THRESHOLD = 24;

/** Force du dithering (0 = aucun grain, 1 = Floyd-Steinberg complet). À 0 l'image est lisse, risque de banding dans les dégradés. */
const DITHER_STRENGTH = 0;

/**
 * Quantification avec dithering Floyd-Steinberg (atténué) : RGB (240×280×3) → indexed (240×280).
 * DITHER_STRENGTH < 1 limite le grain visible tout en réduisant un peu la pixellisation.
 */
function rgbToIndexedWithDithering(
  rgb: Buffer,
  paletteRgb: [number, number, number][],
  outIndexed: Uint8Array
): void {
  const w = ANIM_WIDTH;
  const h = ANIM_HEIGHT;
  const f = new Float64Array(w * h * 3);
  for (let i = 0; i < w * h * 3; i++) f[i] = rgb[i];

  const d = DITHER_STRENGTH;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const r = Math.max(0, Math.min(255, Math.round(f[i])));
      const g = Math.max(0, Math.min(255, Math.round(f[i + 1])));
      const b = Math.max(0, Math.min(255, Math.round(f[i + 2])));
      const luminance = (r + g + b) / 3;
      const forceBlack = luminance < DITHER_BLACK_LUMINANCE_THRESHOLD;
      const idx = forceBlack ? 0 : nearestPaletteIndex(r, g, b, paletteRgb);
      outIndexed[y * w + x] = idx;
      const [pr, pg, pb] = paletteRgb[idx];
      const er = forceBlack ? 0 : (r - pr) * d;
      const eg = forceBlack ? 0 : (g - pg) * d;
      const eb = forceBlack ? 0 : (b - pb) * d;
      if (x + 1 < w) {
        const j = i + 3;
        f[j] += er * (7 / 16);
        f[j + 1] += eg * (7 / 16);
        f[j + 2] += eb * (7 / 16);
      }
      if (y + 1 < h) {
        if (x > 0) {
          const j = (y + 1) * w * 3 + (x - 1) * 3;
          f[j] += er * (3 / 16);
          f[j + 1] += eg * (3 / 16);
          f[j + 2] += eb * (3 / 16);
        }
        const j = (y + 1) * w * 3 + x * 3;
        f[j] += er * (5 / 16);
        f[j + 1] += eg * (5 / 16);
        f[j + 2] += eb * (5 / 16);
        if (x + 1 < w) {
          const k = j + 3;
          f[k] += er * (1 / 16);
          f[k + 1] += eg * (1 / 16);
          f[k + 2] += eb * (1 / 16);
        }
      }
    }
  }
}

/**
 * Encode une frame indexée (240×280) en RLE horizontal.
 * Format : paires (run_length 1-255, color_index). Pas de marqueur de fin de ligne.
 */
function rleEncodeFrame(indexed: Uint8Array): Buffer {
  const width = ANIM_WIDTH;
  const height = ANIM_HEIGHT;
  const chunks: number[] = [];
  let i = 0;
  while (i < width * height) {
    const color = indexed[i];
    let run = 0;
    while (run < 255 && i + run < width * height && indexed[i + run] === color) {
      run++;
    }
    chunks.push(run, color);
    i += run;
  }
  const buf = Buffer.alloc(chunks.length);
  for (let j = 0; j < chunks.length; j++) buf[j] = chunks[j];
  return buf;
}

/**
 * Décode une image JPEG en RGB 280×240 (buffer row-major 280*240*3).
 * Redimensionne à 280×240 si besoin pour accepter toute frame du pipeline.
 */
export async function decodeJpegToRgb280x240(jpegBuffer: Buffer): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  const { data, info } = await sharp(jpegBuffer)
    .resize(280, 240)
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== 280 || info.height !== 240) {
    throw new Error(
      `decodeJpegToRgb280x240: got ${info.width}x${info.height}`
    );
  }
  const ch = info.channels ?? 3;
  if (ch === 3) {
    return Buffer.from(data);
  }
  const out = Buffer.alloc(280 * 240 * 3);
  for (let i = 0; i < 280 * 240; i++) {
    out[i * 3] = data[i * ch];
    out[i * 3 + 1] = data[i * ch + 1];
    out[i * 3 + 2] = data[i * ch + 2];
  }
  return out;
}

/**
 * Génère le fichier .anim à partir de frames RGB 280×240 (row-major, 3 bytes per pixel).
 * Palette adaptée au contenu (median cut sur un échantillon des frames) pour une meilleure qualité.
 * Chaque frame est transposée en 240×280, quantifiée en palette 256 (plus proche couleur + dithering Floyd-Steinberg), puis RLE encodée.
 */
export function encodeRgbFramesToAnim(rgbFrames280x240: Buffer[]): Buffer {
  const { paletteRgb565, paletteRgb } = buildCustomPaletteFromFrames(rgbFrames280x240);
  const paletteSize = 256;

  const header = Buffer.alloc(ANIM_HEADER_SIZE);
  header.write(ANIM_MAGIC, 0);
  header.writeUInt8(ANIM_VERSION, 4);
  header.writeUInt16LE(rgbFrames280x240.length, 5);
  header.writeUInt16LE(ANIM_WIDTH, 7);
  header.writeUInt16LE(ANIM_HEIGHT, 9);
  header.writeUInt8(paletteSize === 256 ? 0 : paletteSize, 11);
  header.writeUInt8(0, 12);
  header.writeUInt8(0, 13);

  const paletteBuffer = Buffer.alloc(paletteSize * 2);
  for (let i = 0; i < paletteSize; i++) {
    paletteBuffer.writeUInt16LE(paletteRgb565[i], i * 2);
  }

  const frameBuffers: Buffer[] = [];
  const transposed = Buffer.alloc(ANIM_WIDTH * ANIM_HEIGHT * 3);
  const indexed = new Uint8Array(ANIM_WIDTH * ANIM_HEIGHT);

  for (const frame of rgbFrames280x240) {
    resize280x240To240x280Center(frame).copy(transposed);
    sharpenRgbBuffer(transposed);
    rgbToIndexedWithDithering(transposed, paletteRgb, indexed);
    const rle = rleEncodeFrame(indexed);
    const frameBlock = Buffer.alloc(4 + rle.length);
    frameBlock.writeUInt32LE(rle.length, 0);
    rle.copy(frameBlock, 4);
    frameBuffers.push(frameBlock);
  }

  return Buffer.concat([header, paletteBuffer, ...frameBuffers]);
}
