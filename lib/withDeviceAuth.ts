/**
 * Middleware pour l'authentification device (Ed25519)
 * Vérifie la signature des requêtes envoyées par l'ESP32.
 * Rétrocompatibilité : si le Kidoo n'a pas de publicKey, la requête est acceptée.
 */

import { NextRequest, NextResponse } from 'next/server';
import nacl from 'tweetnacl';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from './api-response';

const SIGNATURE_HEADER = 'x-kidoo-signature';
const TIMESTAMP_HEADER = 'x-kidoo-timestamp';
const TIMESTAMP_TOLERANCE_SEC = 900; // 15 minutes (drift RTC/ESP32 interne)

function isDevelopmentEnv(): boolean {
  return process.env.NODE_ENV === 'development';
}

function normalizeMacAddress(mac: string): string {
  return mac.replace(/[:.\-]/g, '').toUpperCase();
}

/**
 * Vérifie la signature Ed25519 d'une requête device
 */
async function verifyDeviceSignature(
  request: NextRequest,
  params: Record<string, string>
): Promise<
  | { success: true; kidooId: string }
  | { success: false; response: NextResponse }
> {
  const mac = params.mac || params.macAddress || '';
  if (!mac) {
    return {
      success: false,
      response: createErrorResponse('BAD_REQUEST', 400, {
        message: 'Adresse MAC manquante dans l\'URL',
      }),
    };
  }

  const normalizedMac = normalizeMacAddress(mac);

  // Trouver le Kidoo par MAC
  const allKidoos = await prisma.kidoo.findMany({
    where: { macAddress: { not: null } },
    select: { id: true, macAddress: true, publicKey: true },
  });
  const kidoo = allKidoos.find(
    (k) => k.macAddress && normalizeMacAddress(k.macAddress) === normalizedMac
  );

  if (!kidoo) {
    return {
      success: false,
      response: createErrorResponse('NOT_FOUND', 404, {
        message: 'Kidoo non trouvé pour cette adresse MAC',
      }),
    };
  }

  // Pas de publicKey = rétrocompatibilité, accepter sans vérification
  if (!kidoo.publicKey) {
    return { success: true, kidooId: kidoo.id };
  }

  // En développement: bypass de la vérification de signature pour faciliter le debug
  if (isDevelopmentEnv()) {
    console.log('[withDeviceAuth] 🔓 MODE DEV: Bypass de la vérification de signature');
    return { success: true, kidooId: kidoo.id };
  }

  if (isDevelopmentEnv()) {
    console.log('[withDeviceAuth] publicKey:', kidoo.publicKey);
  }

  // X-Kidoo-Signature (complet) ou A+B (contourne troncature ~44 chars)
  const SIGNATURE_HEADER_A = 'x-kidoo-signature-a';
  const SIGNATURE_HEADER_B = 'x-kidoo-signature-b';
  const sigFull = request.headers.get(SIGNATURE_HEADER);
  const sigA = request.headers.get(SIGNATURE_HEADER_A);
  const sigB = request.headers.get(SIGNATURE_HEADER_B);
  let signatureB64 = sigFull || (sigA && sigB ? sigA + sigB : null);
  let timestampStr = request.headers.get(TIMESTAMP_HEADER);
  const url = request.nextUrl;
  if ((!signatureB64 || signatureB64.length < 80) && url.searchParams.has('sig') && url.searchParams.has('ts')) {
    signatureB64 = url.searchParams.get('sig')!.replace(/ /g, '+');
    timestampStr = url.searchParams.get('ts');
  }

  console.log('[withDeviceAuth] DEBUG sigFull=', !!sigFull, 'len=', sigFull?.length, '| sigA=', !!sigA, 'sigB=', !!sigB, '| sigB64.len=', signatureB64?.length, '| ts=', !!timestampStr);

  if (!signatureB64 || !timestampStr) {
    return {
      success: false,
      response: createErrorResponse('UNAUTHORIZED', 401, {
        message: 'Signature device requise (headers ou ?sig=&ts=)',
      }),
    };
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return {
      success: false,
      response: createErrorResponse('BAD_REQUEST', 400, {
        message: 'Timestamp invalide',
      }),
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const diff = Math.abs(now - timestamp);
  if (diff > TIMESTAMP_TOLERANCE_SEC) {
    if (isDevelopmentEnv()) {
      console.log('[withDeviceAuth] Timestamp expiré | now=', now, 'ts=', timestamp, 'diff=', diff, 's');
    }
    return {
      success: false,
      response: createErrorResponse('UNAUTHORIZED', 401, {
        message: 'Timestamp expiré (replay protection)',
        details: { serverTimestamp: now, deviceTimestamp: timestamp, diffSeconds: diff, toleranceSeconds: TIMESTAMP_TOLERANCE_SEC },
      }),
    };
  }

  const method = request.method;
  const path = request.nextUrl.pathname;
  let body = '';
  try {
    const cloned = request.clone();
    body = await cloned.text();
  } catch {
    // GET n'a pas de body
  }

  // Message identique à l'ESP32 : METHOD\nPATH\nTIMESTAMP (timestampStr = valeur exacte du header)
  const tsForMessage = timestampStr.trim();
  const message =
    body && method !== 'GET'
      ? `${method}\n${path}\n${tsForMessage}\n${body}`
      : `${method}\n${path}\n${tsForMessage}`;

  if (isDevelopmentEnv()) {
    console.log('[withDeviceAuth] Message:', JSON.stringify(message), '| path=', path, '| url.pathname=', request.nextUrl.pathname);
  }

  let signature: Uint8Array;
  let publicKey: Uint8Array;
  try {
    const pubKeyTrimmed = (kidoo.publicKey || '').trim().replace(/\s/g, '');
    signature = new Uint8Array(Buffer.from(signatureB64.trim(), 'base64'));
    publicKey = new Uint8Array(Buffer.from(pubKeyTrimmed, 'base64'));
  } catch {
    return {
      success: false,
      response: createErrorResponse('BAD_REQUEST', 400, {
        message: 'Signature ou clé publique invalide (base64)',
      }),
    }
  }

  if (isDevelopmentEnv()) {
    console.log('[withDeviceAuth] signature.length:', signature.length, '(attendu: 64)');
    console.log('[withDeviceAuth] publicKey.length:', publicKey.length, '(attendu: 32)');
    if (signature.length === 32) {
      console.log('[withDeviceAuth] ATTENTION: 32 bytes = taille clé publique. Utilisez la SIGNATURE (64 bytes), pas la clé publique.');
    }
  }

  const messageBuffer = new Uint8Array(Buffer.from(message, 'utf8'));
  let verified = false;
  try {
    verified = nacl.sign.detached.verify(messageBuffer, signature, publicKey);
  } catch (e) {
    if (isDevelopmentEnv()) {
      console.log('[withDeviceAuth] Erreur nacl.sign.detached.verify:', e);
    }
  }

  if (!verified) {
    if (isDevelopmentEnv()) {
      console.log('[withDeviceAuth] ÉCHEC vérification | sig.len=', signature.length, '| msg.len=', messageBuffer.length);
    }
    return {
      success: false,
      response: createErrorResponse('UNAUTHORIZED', 401, {
        message: 'Signature device invalide',
      }),
    };
  }

  return { success: true, kidooId: kidoo.id };
}

export interface DeviceAuthenticatedRequest extends NextRequest {
  kidooId: string;
}

export type DeviceRouteHandler = (
  request: DeviceAuthenticatedRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wrapper pour protéger les routes appelées par l'ESP32 (nighttime-alert, config)
 * Vérifie la signature Ed25519 si le Kidoo a une publicKey.
 */
export function withDeviceAuth(handler: DeviceRouteHandler) {
  return async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const params = await context.params;
    const result = await verifyDeviceSignature(request, params);

    if (!result.success) {
      return result.response;
    }

    const deviceRequest = request as DeviceAuthenticatedRequest;
    deviceRequest.kidooId = result.kidooId;
    return handler(deviceRequest, context);
  };
}
