/**
 * Visualiseur .anim pour Windows / dev : décode un fichier .anim et exporte les frames en PNG.
 * Accepte un chemin local ou une URL (téléchargement automatique).
 *
 * Usage: node scripts/view-anim.js <fichier.anim|url> [dossier_sortie]
 * Exemples:
 *   node scripts/view-anim.js ./video.anim
 *   node scripts/view-anim.js ./video.anim ./anim-frames
 *   node scripts/view-anim.js "https://example.com/path/video.anim"
 *   npm run view-anim -- "https://..."
 *
 * Si le dossier n'est pas fourni :
 *   - fichier local : ./anim-export à côté du .anim
 *   - URL : ./anim-export/<nom_derive_de_l_url>
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

function isUrl(input) {
  try {
    const u = new URL(input);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function slugFromUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    const base = path.basename(u.pathname || 'export').replace(/\.anim$/i, '') || 'export';
    return base.replace(/[^a-zA-Z0-9_-]/g, '_');
  } catch {
    return 'export';
  }
}

function downloadUrl(urlStr) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const client = u.protocol === 'https:' ? https : http;
    client.get(urlStr, { timeout: 60000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${urlStr}`));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

const ANIM_MAGIC = 'ANIM';
const ANIM_HEADER_SIZE = 14;
const ANIM_WIDTH = 240;
const ANIM_HEIGHT = 280;

function rgb565ToRgb(c) {
  const r = ((c >> 11) & 31) * (255 / 31);
  const g = ((c >> 5) & 63) * (255 / 63);
  const b = (c & 31) * (255 / 31);
  return [r, g, b];
}

function readAnimHeader(buf, offset) {
  const magic = buf.toString('ascii', offset, offset + 4);
  if (magic !== ANIM_MAGIC) throw new Error(`Magic invalide: ${magic}`);
  const version = buf.readUInt8(offset + 4);
  const numFrames = buf.readUInt16LE(offset + 5);
  const width = buf.readUInt16LE(offset + 7);
  const height = buf.readUInt16LE(offset + 9);
  let paletteSize = buf.readUInt8(offset + 11);
  if (paletteSize === 0) paletteSize = 256;
  return { version, numFrames, width, height, paletteSize };
}

function readPalette(buf, offset, paletteSize) {
  const palette = [];
  for (let i = 0; i < paletteSize; i++) {
    const c = buf.readUInt16LE(offset + i * 2);
    palette.push(rgb565ToRgb(c));
  }
  return palette;
}

function decodeRleFrame(rleData, width, height, palette, paletteSize) {
  const rgb = Buffer.alloc(width * height * 3);
  let x = 0, y = 0;
  let i = 0;
  const total = width * height;

  while (y < height && i + 1 < rleData.length) {
    const runLength = rleData[i] || 1;
    const colorIndex = Math.min(rleData[i + 1], paletteSize - 1);
    i += 2;
    const [r, g, b] = palette[colorIndex];

    for (let k = 0; k < runLength && y < height; k++) {
      if (x < width) {
        const idx = (y * width + x) * 3;
        rgb[idx] = r;
        rgb[idx + 1] = g;
        rgb[idx + 2] = b;
      }
      x++;
      if (x >= width) {
        x = 0;
        y++;
      }
    }
  }

  return rgb;
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: node scripts/view-anim.js <fichier.anim|url> [dossier_sortie]');
    console.error('Exemple avec URL: npm run view-anim -- "https://..."');
    process.exit(1);
  }

  let buf;
  let outDir = process.argv[3];

  if (isUrl(input)) {
    console.log('Téléchargement:', input);
    buf = await downloadUrl(input);
    console.log('Téléchargé:', buf.length, 'octets');
    if (!outDir) {
      const slug = slugFromUrl(input);
      outDir = path.join(process.cwd(), 'anim-export', slug);
    }
  } else {
    const filePath = input;
    if (!fs.existsSync(filePath)) {
      console.error('Fichier introuvable:', filePath);
      process.exit(1);
    }
    buf = fs.readFileSync(filePath);
    if (!outDir) {
      outDir = path.join(path.dirname(path.resolve(filePath)), 'anim-export');
    }
  }

  outDir = path.resolve(outDir);
  let offset = 0;

  const header = readAnimHeader(buf, offset);
  offset += ANIM_HEADER_SIZE;
  console.log('Header:', header);

  const palette = readPalette(buf, offset, header.paletteSize);
  offset += header.paletteSize * 2;

  fs.mkdirSync(outDir, { recursive: true });

  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch (e) {
    console.error('Installez sharp: npm install sharp');
    process.exit(1);
  }

  const numFrames = Math.min(header.numFrames, 2000);
  for (let f = 0; f < numFrames && offset + 4 <= buf.length; f++) {
    const rleSize = buf.readUInt32LE(offset);
    offset += 4;
    if (offset + rleSize > buf.length) break;
    const rleData = buf.subarray(offset, offset + rleSize);
    offset += rleSize;

    const rgb = decodeRleFrame(rleData, header.width, header.height, palette, header.paletteSize);
    const outPath = path.join(outDir, `frame_${String(f).padStart(4, '0')}.png`);
    await sharp(rgb, {
      raw: { width: header.width, height: header.height, channels: 3 },
    })
      .png()
      .toFile(outPath);
    if (f % 10 === 0 || f === numFrames - 1) {
      console.log(`Frame ${f + 1}/${numFrames} -> ${outPath}`);
    }
  }

  console.log('');
  console.log('Export terminé. Ouvrez le dossier:', path.resolve(outDir));
  console.log('Si les couleurs sont correctes (rose = rose), le .anim est bon et l\'ESP32 affichera bien.');
  console.log('Si les couleurs sont inversées (bleu au lieu de rose), vérifier la génération serveur ou le swap R/B sur l\'ESP32.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
