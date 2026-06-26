import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/ratelimit';

// Public enriched detail for one person (masked, no contact info). Rate-limited.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!rateLimit('pdetail:' + clientIp(req), 150, 60_000)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 });
  }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });

  const r = await pool.query(
    `SELECT pp.id, pp.status, pp.cedula_masked, pp.display_name, pp.municipio, pp.parroquia,
            pp.hospital_name, pp.photo_path, pp.source_date,
            pr.sex, pr.is_minor,
            CASE WHEN pr.is_minor THEN NULL ELSE pr.note_text END AS note_text,
            (SELECT count(*)::int FROM person_tips t WHERE t.person_report_id = pp.id) AS tips
     FROM person_public pp
     JOIN person_reports pr ON pr.id = pp.id
     WHERE pp.id = $1`,
    [id]
  );
  if (!r.rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(r.rows[0]);
}
