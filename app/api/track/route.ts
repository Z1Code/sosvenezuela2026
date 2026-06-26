import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import pool from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/ratelimit';

export async function POST(req: NextRequest) {
  if (!rateLimit('trk:' + clientIp(req), 120, 60_000)) return NextResponse.json({ ok: false }, { status: 429 });

  let path = '/';
  let ref = '';
  try { const b = await req.json(); path = (b.path || '/').slice(0, 200); ref = (b.ref || '').slice(0, 200); } catch { /* ignore */ }
  if (path.startsWith('/admin') || path.startsWith('/api')) return NextResponse.json({ ok: true });

  let vid = req.cookies.get('vid')?.value;
  const isNew = !vid;
  if (!vid) vid = randomUUID();

  const ua = req.headers.get('user-agent') || '';
  const device = /mobile/i.test(ua) ? 'mobile' : /tablet|ipad/i.test(ua) ? 'tablet' : 'desktop';
  // Keep only external referrers (not our own domain)
  const referrer = ref && !ref.includes('sosvenezuela2026.com') ? ref : null;

  try {
    await pool.query('INSERT INTO page_views (path, visitor, referrer, device) VALUES ($1,$2,$3,$4)', [path, vid, referrer, device]);
  } catch { /* never block the page on analytics */ }

  const res = NextResponse.json({ ok: true });
  if (isNew) res.cookies.set('vid', vid, { maxAge: 60 * 60 * 24 * 365, httpOnly: true, sameSite: 'lax', path: '/' });
  return res;
}
