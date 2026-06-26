import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import pool from '@/lib/db';
import { moderarTexto } from '@/lib/moderacion';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const { estado, msg } = await req.json();

  if (msg) {
    const mod = moderarTexto(msg);
    if (mod.bloqueado) {
      await pool.query(
        `INSERT INTO moderacion_intentos (user_id, canal, contenido_raw, categorias) VALUES ($1,$2,$3,$4)`,
        [user.id, 'checkin', msg, mod.categorias]
      );
      return NextResponse.json({ error: 'Mensaje bloqueado: no se permiten datos de contacto.' }, { status: 422 });
    }
  }

  await pool.query(
    `INSERT INTO safe_checkin (user_id, estado, msg) VALUES ($1,$2,$3)`,
    [user.id, estado || null, msg ? msg.slice(0, 120) : null]
  );
  return NextResponse.json({ ok: true }, { status: 201 });
}
