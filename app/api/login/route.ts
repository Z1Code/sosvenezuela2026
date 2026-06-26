import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { signToken, createTokenCookie } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/ratelimit';

export async function POST(req: NextRequest) {
  if (!await rateLimit('login:' + clientIp(req), 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Credenciales incorrectas.' }, { status: 429 });
  }

  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: 'Faltan campos.' }, { status: 400 });

  const res = await pool.query(
    `SELECT id, email, password_hash, role FROM users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );
  const user = res.rows[0];
  if (!user) return NextResponse.json({ error: 'Credenciales incorrectas.' }, { status: 401 });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return NextResponse.json({ error: 'Credenciales incorrectas.' }, { status: 401 });

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  const headers = new Headers();
  headers.append('Set-Cookie', createTokenCookie(token));
  return NextResponse.json({ ok: true, role: user.role }, { headers });
}