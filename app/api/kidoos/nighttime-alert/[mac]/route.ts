/**
 * GET /api/kidoos/nighttime-alert/[mac]
 * Appelé par l'ESP32 quand l'enfant touche la veilleuse.
 * Même pattern que /api/kidoos/config/[mac] - MAC dans le path, pas de query.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processNighttimeAlert } from '@/lib/nighttime-alert';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mac: string }> }
) {
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
}
