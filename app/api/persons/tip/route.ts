import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import pool from '@/lib/db';
import { moderarTexto } from '@/lib/moderacion';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const { person_id, body, contact } = await req.json();
  if (!person_id || !body?.trim()) return NextResponse.json({ error: 'Faltan campos.' }, { status: 400 });

  const mod = moderarTexto(body);
  if (mod.bloqueado) {
    await pool.query(
      `INSERT INTO moderacion_intentos (user_id, canal, contenido_raw, categorias) VALUES ($1,'tip',$2,$3)`,
      [user.id, body, mod.categorias]
    );
    return NextResponse.json({ error: 'Mensaje bloqueado: no incluyas datos de contacto ni solicitudes de dinero en la descripción.' }, { status: 422 });
  }

  await pool.query(
    `INSERT INTO person_tips (person_report_id, body, contact, user_id) VALUES ($1,$2,$3,$4)`,
    [person_id, body.slice(0, 400), (contact || '').slice(0, 80) || null, user.id]
  );
  return NextResponse.json({ ok: true }, { status: 201 });
}
