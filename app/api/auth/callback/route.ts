import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { signToken, createTokenCookie } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const redirect = state ? decodeURIComponent(state) : '/';

  if (!code) return NextResponse.redirect(new URL('/login?error=no_code', req.url));

  const base = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.get('host')}`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${base}/api/auth/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) return NextResponse.redirect(new URL('/login?error=token_fail', req.url));

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userRes.json();
    const { email, name } = googleUser;
    if (!email) return NextResponse.redirect(new URL('/login?error=no_email', req.url));

    // Upsert user
    const res = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, 'google-oauth', $2, 'citizen')
       ON CONFLICT (email) DO UPDATE SET full_name = COALESCE(users.full_name, $2)
       RETURNING id, email, role`,
      [email.toLowerCase(), name || null]
    );
    const user = res.rows[0];
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    const headers = new Headers();
    headers.append('Set-Cookie', createTokenCookie(token));
    headers.append('Location', redirect.startsWith('/') ? redirect : '/');
    return new Response(null, { status: 302, headers });
  } catch (e) {
    console.error('[google-callback]', e);
    return NextResponse.redirect(new URL('/login?error=server', req.url));
  }
}
