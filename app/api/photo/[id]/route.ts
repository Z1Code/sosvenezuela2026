import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });

  const r = await pool.query('SELECT mime, data FROM person_photos WHERE id = $1', [id]);
  if (!r.rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { mime, data } = r.rows[0];
  return new Response(data, {
    headers: {
      'Content-Type': mime || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}
