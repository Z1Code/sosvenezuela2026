import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cedula = searchParams.get('cedula') || null;
  const phone  = searchParams.get('phone')  || null;
  const name   = searchParams.get('name')   || null;

  if (!cedula && !phone && !name) {
    return NextResponse.json({ error: 'Proporciona cédula, teléfono o nombre.' }, { status: 400 });
  }

  try {
    const res = await pool.query(
      `SELECT * FROM search_person($1,$2,$3)`,
      [cedula, phone, name]
    );
    return NextResponse.json(res.rows);
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
