/**
 * Command JWT Utilities
 * Génération et vérification des tokens JWT pour l'authentification des commandes MQTT
 * Token signé par le serveur avec une clé dérivée unique par device, vérifié par l'ESP32 avant exécution
 */

import jwt from 'jsonwebtoken';
import { createHmac } from 'crypto';

// Master secret pour dériver les clés par device (à mettre dans .env en production)
const CMD_TOKEN_MASTER_SECRET = process.env.CMD_TOKEN_MASTER_SECRET || 'kidoo-cmd-master-dev-only';

// Durée de validité des tokens de commande (court pour prévenir les replays)
const CMD_TOKEN_EXPIRY = '2m'; // 2 minutes

export interface CmdTokenPayload {
  kidooMac: string;  // MAC adresse normalisée du device (ex: "80B54ED96148")
  userId: string;    // Propriétaire du device (proof of ownership)
  action: string;    // Action autorisée (ex: "bedtime", "reboot")
  iat?: number;      // Issued at (auto)
  exp?: number;      // Expiration (auto)
}

/**
 * Dérive une clé secrète unique pour un device via HKDF
 * @param mac - Adresse MAC du device (format flexible: "AA:BB:CC:DD:EE:FF" ou "AABBCCDDEEFF")
 * @returns Buffer contenant la clé dérivée (32 bytes)
 */
export function deriveDeviceSecret(mac: string): Buffer {
  const normalizedMac = mac.replace(/[:-]/g, '').toUpperCase();

  // HKDF-Extract: PRK = HMAC-SHA256(salt=mac, IKM=masterSecret)
  const prk = createHmac('sha256', normalizedMac)
    .update(CMD_TOKEN_MASTER_SECRET)
    .digest();

  // HKDF-Expand: OKM = HMAC-SHA256(PRK, context || 0x01)
  const context = Buffer.concat([
    Buffer.from('kidoo-cmd-token'),
    Buffer.from([0x01]),
  ]);

  return createHmac('sha256', prk).update(context).digest();
}

/**
 * Génère un token de commande JWT
 * @param payload - Données à inclure dans le token (doit contenir kidooMac)
 * @returns Token JWT signé avec la clé dérivée pour ce device
 */
export function generateCmdToken(
  payload: Omit<CmdTokenPayload, 'iat' | 'exp'>
): string {
  const secret = deriveDeviceSecret(payload.kidooMac);
  return jwt.sign(payload, secret, {
    expiresIn: CMD_TOKEN_EXPIRY,
  });
}

/**
 * Vérifie un token de commande JWT
 * @param token - Token à vérifier
 * @param mac - MAC du device auquel le token devrait appartenir
 * @returns Payload décodé ou null si invalide/expiré
 */
export function verifyCmdToken(token: string, mac: string): CmdTokenPayload | null {
  try {
    const secret = deriveDeviceSecret(mac);
    return jwt.verify(token, secret) as CmdTokenPayload;
  } catch (error) {
    return null;
  }
}
