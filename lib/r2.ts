/**
 * Client Cloudflare R2 pour le stockage de fichiers
 * Utilise l'API S3 compatible de Cloudflare R2
 */

import { S3Client, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configuration R2 depuis les variables d'environnement
const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2Endpoint = process.env.R2_ENDPOINT; // Optionnel : endpoint complet (alternative à R2_ACCOUNT_ID)
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.R2_BUCKET_NAME || 'multimedia';
const r2PublicUrl = process.env.R2_PUBLIC_URL; // URL publique du bucket (optionnel, pour CDN)

// Construire l'endpoint : soit depuis R2_ENDPOINT, soit depuis R2_ACCOUNT_ID
const r2EndpointUrl = r2Endpoint || (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : null);

// Vérifier la configuration
if (!r2EndpointUrl || !r2AccessKeyId || !r2SecretAccessKey) {
  // Debug : afficher les variables disponibles pour diagnostiquer
  if (process.env.NODE_ENV === 'development') {
    console.warn('[R2] Debug - Variables d\'environnement R2:');
    console.warn(`  R2_ACCOUNT_ID: ${r2AccountId ? '✓ défini' : '✗ manquant'}`);
    console.warn(`  R2_ENDPOINT: ${r2Endpoint ? '✓ défini' : '✗ manquant'}`);
    console.warn(`  R2_ACCESS_KEY_ID: ${r2AccessKeyId ? '✓ défini' : '✗ manquant'}`);
    console.warn(`  R2_SECRET_ACCESS_KEY: ${r2SecretAccessKey ? '✓ défini' : '✗ manquant'}`);
    console.warn(`  R2_BUCKET_NAME: ${r2BucketName}`);
    console.warn(`  R2_PUBLIC_URL: ${r2PublicUrl ? '✓ défini' : '✗ manquant'}`);
    console.warn('');
    console.warn('[R2] Pour résoudre le problème:');
    console.warn('  1. Vérifiez que le fichier .env ou .env.local existe dans kidoo-server/');
    console.warn('  2. Vérifiez que les variables sont bien définies (sans espaces autour du =)');
    console.warn('  3. Redémarrez le serveur Next.js (npm run dev)');
    console.warn('  4. Vérifiez que le fichier .env n\'est pas dans .gitignore (mais ne commitez pas les valeurs !)');
  }
  
  console.warn(
    '[R2] Variables d\'environnement manquantes. ' +
    'R2_ENDPOINT (ou R2_ACCOUNT_ID), R2_ACCESS_KEY_ID et R2_SECRET_ACCESS_KEY sont requis.'
  );
}

/**
 * Client S3 configuré pour Cloudflare R2
 * R2 utilise l'endpoint: https://<account-id>.r2.cloudflarestorage.com
 * 
 * Vous pouvez soit :
 * - Utiliser R2_ENDPOINT avec l'URL complète
 * - Utiliser R2_ACCOUNT_ID qui sera utilisé pour construire l'endpoint
 */
export const r2Client = r2EndpointUrl && r2AccessKeyId && r2SecretAccessKey
  ? new S3Client({
      region: 'auto', // R2 utilise 'auto' comme région
      endpoint: r2EndpointUrl,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    })
  : null;

/**
 * Nom du bucket pour les fichiers multimédias
 */
export const MULTIMEDIA_BUCKET = r2BucketName;

/**
 * Génère une URL publique pour un fichier R2
 * Si R2_PUBLIC_URL est configuré, utilise cette URL (CDN custom)
 * Sinon, génère une URL signée temporaire
 */
export async function getFileUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
  if (!r2Client) {
    throw new Error('R2 client non configuré');
  }

  // Si une URL publique est configurée (CDN custom), l'utiliser
  if (r2PublicUrl) {
    return `${r2PublicUrl}/${filePath}`;
  }

  // Sinon, générer une URL signée temporaire
  const command = new GetObjectCommand({
    Bucket: MULTIMEDIA_BUCKET,
    Key: filePath,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Chemin R2 pour un firmware
 */
export function getFirmwarePath(model: string, version: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `firmware/${model}/${version}/${safeName}`;
}

/**
 * Chemin R2 pour une part de firmware (règle fixe: firmware/{model}/{version}/part{index}.bin)
 */
export function getFirmwarePartPath(model: string, version: string, partIndex: number): string {
  return getFirmwarePath(model, version, `part${partIndex}.bin`);
}

/**
 * Génère une URL signée (presigned) pour télécharger un firmware.
 * À utiliser pour l’API download : fonctionne même si le bucket R2 n’est pas en accès public
 * (évite l’erreur Authorization / InvalidArgument de R2).
 */
export async function getFirmwareDownloadUrl(path: string, expiresIn: number = 3600): Promise<string> {
  if (!r2Client) {
    throw new Error('R2 client non configuré');
  }
  const command = new GetObjectCommand({
    Bucket: MULTIMEDIA_BUCKET,
    Key: path,
  });
  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * URL directe R2 pour téléchargement firmware par l'ESP (sans passer par le serveur).
 * - Si R2_PUBLIC_URL : URL courte (domaine + path).
 * - Sinon : URL presignée (valide 1 h).
 * Retourne null si R2 n'est pas configuré.
 */
export async function getFirmwareDirectDownloadUrl(path: string, expiresIn: number = 3600): Promise<string | null> {
  if (!r2Client) return null;
  if (r2PublicUrl) {
    return `${r2PublicUrl.replace(/\/$/, '')}/${path}`;
  }
  return await getFirmwareDownloadUrl(path, expiresIn);
}

/**
 * Récupère le stream du binaire firmware depuis R2 (pour diffusion via /api/firmware/serve).
 * URL courte pour l’ESP32 (évite les limites de longueur d’URL sur les presigned R2).
 */
export async function getFirmwareStream(path: string): Promise<{
  Body: import('@aws-sdk/client-s3').GetObjectCommandOutput['Body'];
  ContentLength?: number;
}> {
  if (!r2Client) {
    throw new Error('R2 client non configuré');
  }
  const response = await r2Client.send(
    new GetObjectCommand({
      Bucket: MULTIMEDIA_BUCKET,
      Key: path,
    })
  );
  return { Body: response.Body!, ContentLength: response.ContentLength };
}

/**
 * URL publique d'un firmware (si R2_PUBLIC_URL configuré)
 */
export function getFirmwarePublicUrl(path: string): string {
  if (r2PublicUrl) {
    return `${r2PublicUrl.replace(/\/$/, '')}/${path}`;
  }
  throw new Error('R2_PUBLIC_URL requis pour les firmwares (téléchargements publics)');
}

export interface FirmwareUploadUrlResult {
  uploadUrl: string;
  path: string;
  publicUrl: string;
}

/**
 * Génère une URL signée pour upload PUT (firmware)
 * Le client envoie le fichier directement vers R2
 */
export async function createFirmwareUploadUrl(
  model: string,
  version: string,
  fileName: string,
  fileSize: number,
  expiresIn: number = 3600
): Promise<FirmwareUploadUrlResult> {
  if (!r2Client) {
    throw new Error('R2 client non configuré');
  }

  const path = getFirmwarePath(model, version, fileName);
  const publicUrl = getFirmwarePublicUrl(path);

  const command = new PutObjectCommand({
    Bucket: MULTIMEDIA_BUCKET,
    Key: path,
    ContentLength: fileSize,
    ContentType: 'application/octet-stream',
  });

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn });

  return { uploadUrl, path, publicUrl };
}

/**
 * Upload une part de firmware vers R2 (buffer en mémoire, utilisé par upload-zip).
 */
export async function uploadFirmwarePart(
  model: string,
  version: string,
  partIndex: number,
  body: Buffer
): Promise<string> {
  if (!r2Client) {
    throw new Error('R2 client non configuré');
  }
  const path = getFirmwarePartPath(model, version, partIndex);
  await r2Client.send(
    new PutObjectCommand({
      Bucket: MULTIMEDIA_BUCKET,
      Key: path,
      Body: body,
      ContentType: 'application/octet-stream',
    })
  );
  return path;
}

/**
 * Supprime un fichier du bucket R2
 */
export async function deleteFirmwareFile(path: string): Promise<void> {
  if (!r2Client) {
    throw new Error('R2 client non configuré');
  }
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: MULTIMEDIA_BUCKET,
      Key: path,
    })
  );
}

// --- Character images ---

const CHARACTER_IMAGE_EXT_ALLOWED = /\.(jpg|jpeg|png|webp|gif)$/i;

/**
 * Chemin R2 pour l'image par défaut d'un personnage
 * Convention: characters/{characterId}/default.{ext}
 */
export function getCharacterImagePath(characterId: string, fileName: string): string {
  const ext = CHARACTER_IMAGE_EXT_ALLOWED.exec(fileName)?.[1]?.toLowerCase() ?? 'jpg';
  return `characters/${characterId}/default.${ext}`;
}

/**
 * URL publique pour une image personnage (si R2_PUBLIC_URL configuré)
 */
export function getCharacterImagePublicUrl(path: string): string {
  if (r2PublicUrl) {
    return `${r2PublicUrl.replace(/\/$/, '')}/${path}`;
  }
  throw new Error('R2_PUBLIC_URL requis pour les images personnages (accès public)');
}

export interface CharacterImageUploadUrlResult {
  uploadUrl: string;
  path: string;
  publicUrl: string;
}

/**
 * Génère une URL signée pour upload PUT (image personnage)
 */
export async function createCharacterImageUploadUrl(
  characterId: string,
  fileName: string,
  fileSize: number,
  contentType: string = 'image/jpeg',
  expiresIn: number = 3600
): Promise<CharacterImageUploadUrlResult> {
  if (!r2Client) {
    throw new Error('R2 client non configuré');
  }

  const path = getCharacterImagePath(characterId, fileName);
  const publicUrl = getCharacterImagePublicUrl(path);

  const command = new PutObjectCommand({
    Bucket: MULTIMEDIA_BUCKET,
    Key: path,
    ContentLength: fileSize,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn });

  return { uploadUrl, path, publicUrl };
}

// --- Emotion Video files (mjpeg) ---

/**
 * Chemin R2 pour un fichier emotion-video
 * Convention: emotion-videos/{emotionVideoId}/{fileName}
 */
export function getEmotionVideoFilePath(emotionVideoId: string, fileName: string): string {
  return `emotion-videos/${emotionVideoId}/${fileName}`;
}

/**
 * URL publique pour un fichier emotion-video (si R2_PUBLIC_URL configuré)
 */
export function getEmotionVideoFilePublicUrl(path: string): string {
  if (r2PublicUrl) {
    return `${r2PublicUrl.replace(/\/$/, '')}/${path}`;
  }
  throw new Error('R2_PUBLIC_URL requis pour les emotion-videos (accès public)');
}

/**
 * Upload un buffer vers R2 pour une emotion-video (mjpeg).
 * Retourne l'URL publique du fichier.
 */
export async function uploadEmotionVideoFile(
  emotionVideoId: string,
  fileName: string,
  body: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<string> {
  if (!r2Client) {
    throw new Error('R2 client non configuré');
  }
  const path = getEmotionVideoFilePath(emotionVideoId, fileName);
  const publicUrl = getEmotionVideoFilePublicUrl(path);
  await r2Client.send(
    new PutObjectCommand({
      Bucket: MULTIMEDIA_BUCKET,
      Key: path,
      Body: body,
      ContentType: contentType,
      ContentLength: body.length,
    })
  );
  return publicUrl;
}

// --- Clip files (bin + preview) ---

/**
 * Chemin R2 pour un fichier clip
 * Convention: clips/{clipId}/{fileName}
 */
export function getClipFilePath(clipId: string, fileName: string): string {
  return `clips/${clipId}/${fileName}`;
}

/**
 * URL publique pour un fichier clip (si R2_PUBLIC_URL configuré)
 */
export function getClipFilePublicUrl(path: string): string {
  if (r2PublicUrl) {
    return `${r2PublicUrl.replace(/\/$/, '')}/${path}`;
  }
  throw new Error('R2_PUBLIC_URL requis pour les clips (accès public)');
}

/**
 * Upload un buffer vers R2 pour un clip (bin ou preview).
 * Retourne l'URL publique du fichier.
 */
export async function uploadClipFile(
  clipId: string,
  fileName: string,
  body: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<string> {
  if (!r2Client) {
    throw new Error('R2 client non configuré');
  }
  const path = getClipFilePath(clipId, fileName);
  const publicUrl = getClipFilePublicUrl(path);
  await r2Client.send(
    new PutObjectCommand({
      Bucket: MULTIMEDIA_BUCKET,
      Key: path,
      Body: body,
      ContentType: contentType,
      ContentLength: body.length,
    })
  );
  return publicUrl;
}
