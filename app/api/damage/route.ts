import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { getUserFromRequest } from '@/lib/auth';
import pool from '@/lib/db';
import { moderarTexto } from '@/lib/moderacion';
import { rateLimit, clientIp } from '@/lib/ratelimit';

// Las fotos se guardan como archivos en disco (servidos por nginx en /fotos/),
// no como bytea en Postgres. UPLOAD_DIR se monta como volumen en el contenedor.
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

// GET: cola de validación para ingenieros (submissions que el usuario aún no validó)
export async function GET(req: NextRequest) {
  if (!await rateLimit('dmgq:' + clientIp(req), 120, 60_000)) return NextResponse.json({ error: 'rate' }, { status: 429 });
  const user = getUserFromRequest(req);
  const uid = user?.id || null;
  const res = await pool.query(
    `SELECT s.id, s.zona, s.municipio, s.building_type, s.note, s.photo_ids, s.validations, s.created_at
     FROM damage_submissions s
     WHERE ($1::uuid IS NULL OR NOT EXISTS (SELECT 1 FROM damage_validations v WHERE v.submission_id = s.id AND v.validator_id = $1))
     ORDER BY s.validations ASC, s.created_at DESC
     LIMIT 30`,
    [uid]
  );
  return NextResponse.json(res.rows);
}

// POST: residente sube fotos + datos del daño
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const b = await req.json();
  const { zona, municipio, building_type, note, photos } = b;
  if (!Array.isArray(photos) || photos.length === 0) return NextResponse.json({ error: 'Sube al menos una foto.' }, { status: 400 });
  if (photos.length > 6) return NextResponse.json({ error: 'Máximo 6 fotos.' }, { status: 400 });

  if (note) { const m = moderarTexto(note); if (m.bloqueado) return NextResponse.json({ error: 'Nota bloqueada: no incluyas datos de contacto ni dinero.' }, { status: 422 }); }

  await mkdir(UPLOAD_DIR, { recursive: true }).catch(() => {});
  const ids: string[] = [];
  for (const p of photos) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(p || '');
    if (!m) continue;
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length < 200 || buf.length > 6_000_000) continue;
    const ext = m[1] === 'image/png' ? 'png' : m[1] === 'image/webp' ? 'webp' : 'jpg';
    const fname = randomUUID() + '.' + ext;
    await writeFile(`${UPLOAD_DIR}/${fname}`, buf);
    ids.push('/fotos/' + fname);
  }
  if (!ids.length) return NextResponse.json({ error: 'No se pudieron procesar las fotos.' }, { status: 400 });

  const r = await pool.query(
    `INSERT INTO damage_submissions (zona, municipio, building_type, note, photo_ids, submitter_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [(zona || '').slice(0, 120) || null, (municipio || '').slice(0, 80) || null, (building_type || '').slice(0, 40) || null, (note || '').slice(0, 400) || null, ids, user.id]
  );
  return NextResponse.json({ ok: true, id: r.rows[0].id }, { status: 201 });
}
