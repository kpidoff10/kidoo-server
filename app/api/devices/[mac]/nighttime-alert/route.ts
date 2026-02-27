/**
 * GET /api/devices/[mac]/nighttime-alert
 * Appelé par l'ESP32 quand l'enfant touche la veilleuse.
 * Protégé par signature Ed25519 si le Kidoo a une publicKey.
 */

import { NextResponse } from 'next/server';
import { processNighttimeAlert } from '@/lib/nighttime-alert';
import { withDeviceAuth } from '@/lib/withDeviceAuth';

export const GET = withDeviceAuth(async (request, { params }) => {
  try {
    const { mac } = await params;
    const result = await processNighttimeAlert(mac);

    if (result.status >= 400) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: result.ok,
      pushed: result.pushed ?? 0,
      ...(result.reason && { reason: result.reason }),
    });
  } catch (error) {
    console.error('[nighttime-alert] Erreur:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
});
