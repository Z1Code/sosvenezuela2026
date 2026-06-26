import { NextResponse } from 'next/server';
import { createLogoutCookie } from '@/lib/auth';

export async function POST() {
  const headers = new Headers();
  headers.append('Set-Cookie', createLogoutCookie());
  return NextResponse.json({ ok: true }, { headers });
}
