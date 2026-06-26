import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const b = await req.json();
  const { status, cedula, cedula_type, given_name, family_name, full_name,
    is_minor, sex, age_min, age_max, phone, municipio, parroquia,
    hospital_name, note_text, is_self_report } = b;

  if (!full_name || !status) return NextResponse.json({ error: 'Nombre y estado requeridos.' }, { status: 400 });

  const res = await pool.query(
    `INSERT INTO person_reports
      (status, cedula, cedula_type, given_name, family_name, full_name,
       is_minor, sex, age_min, age_max, phone, municipio, parroquia,
       hospital_name, note_text, is_self_report, reporter_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING id`,
    [status, cedula || null, cedula_type || null, given_name || null, family_name || null, full_name,
     is_minor || false, sex || null, age_min || null, age_max || null, phone || null,
     municipio || null, parroquia || null, hospital_name || null, note_text || null,
     is_self_report || false, user.id]
  );

  return NextResponse.json({ id: res.rows[0].id }, { status: 201 });
}
