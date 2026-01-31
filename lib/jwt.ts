/**
 * JWT Utilities
 * Génération et vérification des tokens JWT pour l'authentification mobile
 */

import jwt from 'jsonwebtoken';

// Secrets (à mettre dans .env en production)
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'kidoo-access-secret-dev-only';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'kidoo-refresh-secret-dev-only';

// Durées de validité
const ACCESS_TOKEN_EXPIRY = '15m';  // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d';  // 7 jours

export interface TokenPayload {
  userId: string;
  email: string;
}

/**
 * Génère un access token (courte durée)
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Génère un refresh token (longue durée)
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Génère les deux tokens
 */
export function generateTokens(payload: TokenPayload): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

/**
 * Vérifie un access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Vérifie un refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Extrait le token du header Authorization
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
