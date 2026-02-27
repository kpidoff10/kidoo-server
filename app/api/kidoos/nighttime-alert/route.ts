/**
 * POST /api/kidoos/nighttime-alert
 * Pour les clients qui envoient la MAC dans le body (ex: app, webhooks).
 * Body: { "mac": "AA:BB:CC:DD:EE:FF" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { processNighttimeAlert } from '@/lib/nighttime-alert';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const mac = typeof body.mac === 'string' ? body.mac : body.macAddress ?? '';

    if (!mac) {
      return NextResponse.json(
        { error: 'mac requis dans le body (ex: {"mac":"AA:BB:CC:DD:EE:FF"})' },
        { status: 400 }
      );
    }

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
    console.error('[nighttime-alert POST] Erreur:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
