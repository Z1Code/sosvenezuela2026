import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Últimos análisis de daño estructural (público, para el carrusel de /validar).
export async function GET() {
  const r = await pool.query(
    `SELECT id, zona, municipio, building_type, note, photo_ids, validations,
            habitable_votes, inhabitable_votes, uncertain_votes, created_at
     FROM damage_submissions
     ORDER BY created_at DESC
     LIMIT 3`
  );
  return NextResponse.json(r.rows, { headers: { 'Cache-Control': 'public, max-age=30' } });
}
