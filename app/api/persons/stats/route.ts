import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const r = await pool.query(`SELECT status, count(*)::int AS n FROM person_public GROUP BY status`);
  let missing = 0, found = 0, total = 0;
  for (const row of r.rows) {
    total += row.n;
    if (row.status === 'seeking_info') missing += row.n;
    else if (['found_alive', 'self_safe', 'sheltered', 'hospitalized'].includes(row.status)) found += row.n;
  }
  // Sin stale-while-revalidate: home y /buscar comparten endpoint y deben mostrar
  // SIEMPRE la misma cifra. SWR servía snapshots distintos a cada página durante las
  // ráfagas del cron. Caché corta y atómica (mismo objeto para ambas) evita el desfase.
  return NextResponse.json({ missing, found, total }, { headers: { 'Cache-Control': 'public, max-age=20' } });
}
