import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Balance de la emergencia: parte EN VIVO (nuestros reportes + réplicas USGS) y
// parte OFICIAL (tabla emergency_status, editable sin redeploy).
export async function GET() {
  const [collapsed, status] = await Promise.all([
    pool.query("SELECT count(*)::int n FROM hazard_reports WHERE category='collapsed_building' AND deleted_at IS NULL"),
    pool.query('SELECT key, value, label, updated_at FROM emergency_status'),
  ]);

  // Réplicas registradas por USGS desde el sismo principal (excluye los dos M≥7).
  let aftershocks: number | null = null, maxAfter: number | null = null;
  try {
    const u = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2026-06-24T17:00:00&latitude=10.45&longitude=-68.51&maxradiuskm=250&minmagnitude=2.5';
    const j = await (await fetch(u, { signal: AbortSignal.timeout(8000) })).json();
    const after = (j.features || []).filter((f: { properties: { mag: number | null } }) => (f.properties.mag || 0) < 7);
    aftershocks = after.length;
    maxAfter = after.reduce((m: number, f: { properties: { mag: number | null } }) => Math.max(m, f.properties.mag || 0), 0) || null;
  } catch { /* USGS no disponible */ }

  const official = Object.fromEntries(status.rows.map(r => [r.key, { value: r.value, label: r.label, updated_at: r.updated_at }]));
  const officialUpdated = status.rows.reduce((max: string | null, r) => (!max || r.updated_at > max ? r.updated_at : max), null);

  return NextResponse.json({
    live: {
      collapsed: collapsed.rows[0].n,
      aftershocks,
      maxAfter,
      updated_at: new Date().toISOString(),
    },
    official,
    official_updated: officialUpdated,
  }, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' } });
}
