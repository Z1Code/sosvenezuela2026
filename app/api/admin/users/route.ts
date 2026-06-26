import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Prohibido.' }, { status: 403 });

  const res = await pool.query(
    `SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at DESC`
  );
  return NextResponse.json(res.rows);
}

export async function PATCH(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Prohibido.' }, { status: 403 });

  const { id, role } = await req.json();
  if (!['citizen','responder','admin'].includes(role)) return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 });

  await pool.query(`UPDATE users SET role = $1 WHERE id = $2`, [role, id]);
  return NextResponse.json({ ok: true });
}
