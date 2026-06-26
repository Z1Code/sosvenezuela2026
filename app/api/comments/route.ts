import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import pool from '@/lib/db';
import { moderarTexto } from '@/lib/moderacion';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reportId = searchParams.get('report_id');
  if (!reportId) return NextResponse.json({ error: 'report_id requerido.' }, { status: 400 });

  const res = await pool.query(
    `SELECT rc.id, rc.body, rc.created_at, u.full_name
     FROM report_comment rc
     JOIN users u ON u.id = rc.user_id
     WHERE rc.report_id = $1 AND rc.hidden = false
     ORDER BY rc.created_at`,
    [reportId]
  );
  return NextResponse.json(res.rows);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const { report_id, body } = await req.json();
  if (!report_id || !body?.trim()) return NextResponse.json({ error: 'Faltan campos.' }, { status: 400 });

  const mod = moderarTexto(body);
  if (mod.bloqueado) {
    await pool.query(
      `INSERT INTO moderacion_intentos (user_id, canal, contenido_raw, categorias) VALUES ($1,$2,$3,$4)`,
      [user.id, 'comment', body, mod.categorias]
    );
    return NextResponse.json({ error: 'Comentario bloqueado: no se permiten datos de contacto ni solicitudes de dinero.' }, { status: 422 });
  }

  await pool.query(
    `INSERT INTO report_comment (report_id, user_id, body) VALUES ($1,$2,$3)`,
    [report_id, user.id, body.slice(0, 200)]
  );
  return NextResponse.json({ ok: true }, { status: 201 });
}
