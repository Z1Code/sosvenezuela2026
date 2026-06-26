import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import pool from '@/lib/db';
import { moderarTexto } from '@/lib/moderacion';

export async function GET() {
  const res = await pool.query(
    `SELECT cm.id, cm.body, cm.created_at, u.full_name
     FROM chat_messages cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.channel = 'ops'
     ORDER BY cm.created_at DESC
     LIMIT 100`
  );
  return NextResponse.json(res.rows.reverse());
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: 'Mensaje vacío.' }, { status: 400 });
  if (body.length > 500) return NextResponse.json({ error: 'Mensaje muy largo (máx 500 chars).' }, { status: 400 });

  const mod = moderarTexto(body);
  if (mod.bloqueado) {
    await pool.query(
      `INSERT INTO moderacion_intentos (user_id, canal, contenido_raw, categorias) VALUES ($1,$2,$3,$4)`,
      [user.id, 'chat', body, mod.categorias]
    );
    return NextResponse.json({
      error: 'Mensaje bloqueado: no se permiten datos de contacto ni solicitudes de dinero en este canal.'
    }, { status: 422 });
  }

  await pool.query(
    `INSERT INTO chat_messages (channel, body, user_id) VALUES ('ops',$1,$2)`,
    [body.trim(), user.id]
  );
  return NextResponse.json({ ok: true }, { status: 201 });
}
