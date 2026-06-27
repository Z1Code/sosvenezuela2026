import pool from './db';
import type { NextRequest } from 'next/server';

export function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export async function rateLimit(
  key: string,
  max = 80,
  windowMs = 60_000
): Promise<boolean> {
  const windowBucket = Math.floor(Date.now() / windowMs);
  try {
    const { rows } = await pool.query<{ count: number }>(
      `INSERT INTO rate_limits (key, window_bucket, count, expires_at)
       VALUES ($1, $2, 1, now() + make_interval(secs => $3))
       ON CONFLICT (key, window_bucket) DO UPDATE
         SET count = rate_limits.count + 1
       RETURNING count`,
      [key, windowBucket, (windowMs * 2) / 1000]
    );
    // Limpieza async --> nunca bloquea la respuesta
    pool.query(`DELETE FROM rate_limits WHERE expires_at < now()`).catch(() => {});
    return rows[0].count <= max;
  } catch {
    // Fail open: si la DB no está disponible, dejamos pasar la petición
    // antes de bloquear reportes de emergencia.
    return true;
  }
}