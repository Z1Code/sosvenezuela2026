import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/ratelimit';

// Public, anti-scraping directory of persons (uses person_public — masked cédula,
// no contact info). Rate-limited per IP; page size capped at 100.
export async function GET(req: NextRequest) {
  if (!await rateLimit('plist:' + clientIp(req), 90, 60_000)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Espera un momento.' }, { status: 429 });
  }

  const sp = req.nextUrl.searchParams;
  const offset = Math.max(0, parseInt(sp.get('offset') || '0', 10) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '100', 10) || 100));
  const q = (sp.get('q') || '').trim().slice(0, 60);
  const estado = sp.get('estado');

  const params: (string | number)[] = [];
  let where = '1=1';
  if (q.length >= 2) { params.push('%' + q + '%'); where += ` AND display_name ILIKE $${params.length}`; }
  if (estado === 'seeking_info' || estado === 'found_alive') { params.push(estado); where += ` AND status = $${params.length}`; }
  params.push(limit); const lp = params.length;
  params.push(offset); const op = params.length;

  const res = await pool.query(
    `SELECT id, status, cedula_masked, display_name, municipio, parroquia, hospital_name, photo_path, source_date
     FROM person_public
     WHERE ${where}
     ORDER BY (photo_path IS NOT NULL) DESC, source_date DESC
     LIMIT $${lp} OFFSET $${op}`,
    params
  );
  return NextResponse.json(res.rows, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=90' } });
}
