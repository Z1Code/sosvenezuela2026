import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserFromCookie } from '@/lib/auth';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const TW_EPOCH = 1288834974657; // Twitter snowflake epoch (ms)

function tweetIdFrom(url: string): string | null {
  const m = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status(?:es)?\/(\d+)/i);
  return m ? m[1] : null;
}
// The tweet's publication time is encoded in its snowflake id (id >> 22 + epoch).
// Number() loses <1ms of precision here — irrelevant for ordering by hour.
function postedAtFrom(id: string): Date {
  return new Date(Math.floor(Number(id) / 4194304) + TW_EPOCH);
}

export async function GET() {
  const r = await pool.query('select id, tweet_id, url, posted_at from tweets order by posted_at desc limit 60');
  return NextResponse.json(r.rows);
}

export async function POST(req: NextRequest) {
  const user = await getUserFromCookie();
  if (!user || !ADMIN_EMAIL || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Solo el administrador puede agregar tweets.' }, { status: 403 });

  const { url } = await req.json();
  const id = tweetIdFrom(url || '');
  if (!id) return NextResponse.json({ error: 'Enlace inválido. Pega una URL como https://x.com/usuario/status/1234567890' }, { status: 400 });

  const posted = postedAtFrom(id);
  await pool.query(
    `insert into tweets (tweet_id, url, posted_at, added_by) values ($1,$2,$3,$4)
     on conflict (tweet_id) do nothing`,
    [id, url.trim(), posted.toISOString(), user.id]
  );
  return NextResponse.json({ ok: true, tweet_id: id, posted_at: posted.toISOString() }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getUserFromCookie();
  if (!user || !ADMIN_EMAIL || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Solo el administrador.' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido.' }, { status: 400 });
  await pool.query('delete from tweets where id=$1', [id]);
  return NextResponse.json({ ok: true });
}
