/**
 * Utilitaires pour vérifier les signatures Ed25519
 * Utilise WebCrypto API (crypto.subtle)
 */

import crypto from 'crypto';

/**
 * Vérifier une signature Ed25519
 * @param publicKeyBase64 Clé publique en base64
 * @param message Message à vérifier (Buffer ou string)
 * @param signatureBase64 Signature en base64
 * @returns true si la signature est valide, false sinon
 */
export async function verifyEd25519Signature(
  publicKeyBase64: string,
  message: Buffer | string,
  signatureBase64: string
): Promise<boolean> {
  try {
    // Décoder les buffers
    const publicKeyBuffer = Buffer.from(publicKeyBase64, 'base64');
    const messageBuffer = typeof message === 'string' ? Buffer.from(message) : message;
    const signatureBuffer = Buffer.from(signatureBase64, 'base64');

    // Importer la clé publique Ed25519 (format raw)
    const publicKey = await crypto.subtle.importKey(
      'raw',
      publicKeyBuffer,
      'Ed25519',
      false,
      ['verify']
    );

    // Vérifier la signature
    const isValid = await crypto.subtle.verify(
      'Ed25519',
      publicKey,
      signatureBuffer,
      messageBuffer
    );

    return isValid;
  } catch (error) {
    console.error('[ED25519] Erreur vérification signature:', error);
    return false;
  }
}
