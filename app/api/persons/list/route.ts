import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/ratelimit';

// Public, anti-scraping directory of persons (uses person_public — masked cédula,
// no contact info). Rate-limited per IP; page size capped at 100.
export async function GET(req: NextRequest) {
  if (!rateLimit('plist:' + clientIp(req), 90, 60_000)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Espera un momento.' }, { status: 429 });
  }

  const sp = req.nextUrl.searchParams;
  const offset = Math.max(0, parseInt(sp.get('offset') || '0', 10) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '100', 10) || 100));
  const q = (sp.get('q') || '').trim().slice(0, 60);
  const estado = sp.get('estado');

  const params: (string | number)[] = [];
  const hasQ = q.length >= 2;
  let join = '';
  let where = '1=1';
  let qp = 0;

  // Búsqueda difusa (acentos/orden/tipeo) sobre el nombre real (full_name),
  // devolviendo siempre el display_name enmascarado de person_public.
  if (hasQ) {
    params.push(q); qp = params.length;
    join = 'JOIN person_reports r ON r.id = p.id';
    where += ` AND ( f_unaccent(r.full_name) % f_unaccent($${qp})
                     OR f_unaccent(r.full_name) ILIKE '%' || f_unaccent($${qp}) || '%' )`;
  }
  if (estado === 'seeking_info' || estado === 'found_alive') { params.push(estado); where += ` AND p.status = $${params.length}`; }
  params.push(limit); const lp = params.length;
  params.push(offset); const op = params.length;

  const orderBy = hasQ
    ? `GREATEST(similarity(f_unaccent(r.full_name), f_unaccent($${qp})),
                word_similarity(f_unaccent($${qp}), f_unaccent(r.full_name))) DESC,
       (p.photo_path IS NOT NULL) DESC, p.source_date DESC`
    : `(p.photo_path IS NOT NULL) DESC, p.source_date DESC`;

  const res = await pool.query(
    `SELECT p.id, p.status, p.cedula_masked, p.display_name, p.municipio, p.parroquia, p.hospital_name, p.photo_path, p.source_date
     FROM person_public p
     ${join}
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT $${lp} OFFSET $${op}`,
    params
  );
  return NextResponse.json(res.rows, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=90' } });
}
