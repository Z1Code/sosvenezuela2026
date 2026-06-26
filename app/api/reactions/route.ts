import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const { report_id, kind } = await req.json();
  if (!report_id || !['confirmo','sigue','resuelto','disputo'].includes(kind)) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO report_reaction (report_id, user_id, kind)
     VALUES ($1,$2,$3)
     ON CONFLICT (report_id, user_id, kind) DO NOTHING`,
    [report_id, user.id, kind]
  );

  const res = await pool.query(
    `SELECT kind, count(*)::int FROM report_reaction WHERE report_id=$1 GROUP BY kind`,
    [report_id]
  );
  return NextResponse.json({ counts: res.rows });
}
