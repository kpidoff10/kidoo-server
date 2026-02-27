/**
 * GET /api/devices/[mac]/device-auth-test
 * Route de test pour la signature device Ed25519.
 * Protégée par withDeviceAuth - si la signature est valide, retourne 200.
 * Utiliser depuis Serial ESP32: auth-test
 */

import { NextResponse } from 'next/server';
import { withDeviceAuth } from '@/lib/withDeviceAuth';

export const GET = withDeviceAuth(async (request, { params }) => {
  const { mac } = await params;
  return NextResponse.json({
    ok: true,
    message: 'Signature device valide',
    mac,
    timestamp: Math.floor(Date.now() / 1000),
  });
});
