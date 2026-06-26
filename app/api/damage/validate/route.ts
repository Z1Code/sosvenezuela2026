import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import pool from '@/lib/db';

const HAB = ['habitable', 'inhabitable', 'incierto'];
const SEV = ['leve', 'moderado', 'severo', 'colapso'];

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const { submission_id, habitabilidad, severidad, note } = await req.json();
  if (!submission_id || !HAB.includes(habitabilidad)) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
  const sev = SEV.includes(severidad) ? severidad : null;

  const ins = await pool.query(
    `INSERT INTO damage_validations (submission_id, validator_id, habitabilidad, severidad, note)
     VALUES ($1,$2,$3,$4,$5) ON CONFLICT (submission_id, validator_id) DO NOTHING RETURNING id`,
    [submission_id, user.id, habitabilidad, sev, (note || '').slice(0, 300) || null]
  );
  if (!ins.rows.length) return NextResponse.json({ ok: true, already: true });

  const col = habitabilidad === 'habitable' ? 'habitable_votes' : habitabilidad === 'inhabitable' ? 'inhabitable_votes' : 'uncertain_votes';
  await pool.query(`UPDATE damage_submissions SET ${col} = ${col} + 1, validations = validations + 1 WHERE id = $1`, [submission_id]);
  return NextResponse.json({ ok: true }, { status: 201 });
}
