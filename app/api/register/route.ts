import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { signToken, createTokenCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password, full_name } = await req.json();
  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: 'Email y contraseña (mín. 6 chars) requeridos.' }, { status: 400 });
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    const res = await pool.query(
      `INSERT INTO users (email, password_hash, full_name) VALUES ($1,$2,$3) RETURNING id, email, role`,
      [email.toLowerCase().trim(), hash, full_name || null]
    );
    const user = res.rows[0];
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const headers = new Headers();
    headers.append('Set-Cookie', createTokenCookie(token));
    return NextResponse.json({ ok: true }, { status: 201, headers });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') return NextResponse.json({ error: 'Este correo ya está registrado.' }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
