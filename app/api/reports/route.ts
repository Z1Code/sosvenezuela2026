import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET() {
  const res = await pool.query(
    `SELECT id, category, severity, resource_status, verification, title, description,
            lat_pub, lng_pub, municipio, parroquia, building_type,
            people_trapped_count, source_url, image_url, created_at
     FROM hazard_reports
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT 500`
  );
  return NextResponse.json(res.rows, { headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60' } });
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const b = await req.json();
  const { category, severity, resource_status, title, description,
    lat, lng, parroquia, municipio, trapped, trapped_unknown,
    anyone_inside, occupancy, building_type } = b;

  if (!category || !lat || !lng) return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });

  try {
    const res = await pool.query(
      `SELECT create_hazard_report($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) AS id`,
      [user.id, category, severity || null, resource_status || null,
       title || null, description || null, lat, lng, parroquia || null, municipio || null,
       trapped || null, trapped_unknown || false,
       anyone_inside || null, occupancy || null, building_type || null]
    );
    return NextResponse.json({ id: res.rows[0].id }, { status: 201 });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
