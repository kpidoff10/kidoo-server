/**
 * Extraction côté client : capture la frame depuis la vidéo (même rendu que le tooltip)
 * puis extrait chaque région/artefact. Utilise le Canvas API = exactement ce que voit l'utilisateur.
 */

import { expandRegionForPreview } from '../constants';

const REGION_KEYS = ['leftEye', 'rightEye', 'mouth'] as const;

export interface RegionToExtract {
  type: 'region';
  regionKey: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ArtifactToExtract {
  type: 'artifact';
  artifactId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ExtractItem {
  frameIndex: number;
  item: RegionToExtract | ArtifactToExtract;
}

export async function extractRegionsFromVideo(
  videoUrl: string,
  fps: number,
  targetWidth: number,
  targetHeight: number,
  faceRegionsByFrame: Record<string, Record<string, { x: number; y: number; w: number; h: number }>>,
  artifactsByFrame: Record<string, Array<{ id?: string; x: number; y: number; w: number; h: number }>>,
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, Blob>> {
  const results = new Map<string, Blob>();

  const items: ExtractItem[] = [];
  for (const [fiStr, regions] of Object.entries(faceRegionsByFrame ?? {})) {
    const fi = parseInt(fiStr, 10);
    if (Number.isNaN(fi) || !regions) continue;
    for (const key of REGION_KEYS) {
      const r = regions[key];
      if (r) items.push({ frameIndex: fi, item: { type: 'region', regionKey: key, ...r } });
    }
  }
  for (const [fiStr, arts] of Object.entries(artifactsByFrame ?? {})) {
    const fi = parseInt(fiStr, 10);
    if (Number.isNaN(fi) || !Array.isArray(arts)) continue;
    for (const a of arts) {
      if (a.id) items.push({ frameIndex: fi, item: { type: 'artifact', artifactId: a.id, ...a } });
    }
  }

  if (items.length === 0) return results;

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  video.src = videoUrl;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => {
      const msg = video.error?.message ?? 'Vidéo non chargée';
      reject(new Error(`Vidéo non chargée (${msg}). Vérifiez CORS ou utilisez le proxy.`));
    };
  });

  const frameWidth = video.videoWidth;
  const frameHeight = video.videoHeight;
  if (!frameWidth || !frameHeight) throw new Error('Dimensions vidéo invalides');

  const scale = Math.min(targetWidth / frameWidth, targetHeight / frameHeight);
  const scaledW = frameWidth * scale;
  const scaledH = frameHeight * scale;
  const padLeft = (targetWidth - scaledW) / 2;
  const padTop = (targetHeight - scaledH) / 2;

  const frameIndices = [...new Set(items.map((i) => i.frameIndex))].sort((a, b) => a - b);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D non disponible');

  const drawCanvas = document.createElement('canvas');
  drawCanvas.width = frameWidth;
  drawCanvas.height = frameHeight;
  const drawCtx = drawCanvas.getContext('2d');
  if (!drawCtx) throw new Error('Canvas 2D non disponible');

  let done = 0;

  for (const frameIndex of frameIndices) {
    const seekTime = frameIndex / fps;
    video.currentTime = seekTime;
    await new Promise<void>((resolveSeek) => {
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        video.removeEventListener('seeked', onSeeked);
        // Laisser le navigateur décode la frame (seeked peut précéder le rendu)
        setTimeout(resolveSeek, 100);
      };
      const onSeeked = () => done();
      const timeout = setTimeout(done, 3000);
      video.addEventListener('seeked', onSeeked);
    });

    drawCtx.drawImage(video, 0, 0);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(
      drawCanvas,
      0, 0, frameWidth, frameHeight,
      padLeft, padTop, scaledW, scaledH
    );

    const frameItems = items.filter((i) => i.frameIndex === frameIndex);
    for (const { item } of frameItems) {
      const exp = expandRegionForPreview({
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      });
      const xNorm = (padLeft + exp.x * scaledW) / targetWidth;
      const yNorm = (padTop + exp.y * scaledH) / targetHeight;
      const wNorm = (exp.w * scaledW) / targetWidth;
      const hNorm = (exp.h * scaledH) / targetHeight;

      const xPx = Math.max(0, Math.round(xNorm * targetWidth));
      const yPx = Math.max(0, Math.round(yNorm * targetHeight));
      const wPx = Math.min(targetWidth - xPx, Math.round(wNorm * targetWidth));
      const hPx = Math.min(targetHeight - yPx, Math.round(hNorm * targetHeight));

      if (wPx <= 0 || hPx <= 0) continue;

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = targetWidth;
      cropCanvas.height = targetHeight;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) continue;
      cropCtx.clearRect(0, 0, targetWidth, targetHeight);
      cropCtx.drawImage(
        canvas,
        xPx, yPx, wPx, hPx,
        xPx, yPx, wPx, hPx
      );

      const blob = await new Promise<Blob | null>((res) =>
        cropCanvas.toBlob(res, 'image/png')
      );
      const key =
        item.type === 'region'
          ? `region-${frameIndex}-${item.regionKey}`
          : `artifact-${frameIndex}-${item.artifactId}`;
      if (blob) results.set(key, blob);
      done++;
      onProgress?.(done, items.length);
    }
  }

  return results;
}
