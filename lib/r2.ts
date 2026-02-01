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
