import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const { cedula, label } = await req.json();
  if (!cedula) return NextResponse.json({ error: 'Cédula requerida.' }, { status: 400 });

  const norm = cedula.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (!norm) return NextResponse.json({ error: 'Cédula inválida.' }, { status: 400 });

  await pool.query(
    `INSERT INTO watch_subscriptions (watcher_id, cedula_norm, label)
     VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [user.id, norm, label || null]
  );
  return NextResponse.json({ ok: true }, { status: 201 });
}
