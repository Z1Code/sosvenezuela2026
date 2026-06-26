import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserFromCookie } from '@/lib/auth';

export async function GET() {
  const user = await getUserFromCookie();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [
    usersTotal, usersToday, usersGoogle,
    reportsTotal, reportsToday, reportsRojo,
    personsTotal, personsFound,
    checkinsTotal, checkinsToday,
    chatsTotal,
    modTotal, modToday,
    recentUsers, recentReports,
    viewsTotal, viewsToday, visUnique, visToday,
    viewsByDay, topPaths, devices, referrers,
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM users`),
    pool.query(`SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '24 hours'`),
    pool.query(`SELECT COUNT(*) FROM users WHERE password_hash = 'google-oauth'`),
    pool.query(`SELECT COUNT(*) FROM hazard_reports`),
    pool.query(`SELECT COUNT(*) FROM hazard_reports WHERE created_at >= NOW() - INTERVAL '24 hours'`),
    pool.query(`SELECT COUNT(*) FROM hazard_reports WHERE severity = 'rojo'`),
    pool.query(`SELECT COUNT(*) FROM person_reports`),
    pool.query(`SELECT COUNT(*) FROM person_reports WHERE status = 'found'`),
    pool.query(`SELECT COUNT(*) FROM safety_checkins`),
    pool.query(`SELECT COUNT(*) FROM safety_checkins WHERE created_at >= NOW() - INTERVAL '24 hours'`),
    pool.query(`SELECT COUNT(*) FROM chat_messages`),
    pool.query(`SELECT COUNT(*) FROM moderacion_intentos`),
    pool.query(`SELECT COUNT(*) FROM moderacion_intentos WHERE created_at >= NOW() - INTERVAL '24 hours'`),
    pool.query(`SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at DESC LIMIT 50`),
    pool.query(`SELECT id, title, category, severity, verification, municipio, created_at FROM hazard_reports ORDER BY created_at DESC LIMIT 50`),
    pool.query(`SELECT COUNT(*) FROM page_views`),
    pool.query(`SELECT COUNT(*) FROM page_views WHERE created_at >= NOW() - INTERVAL '24 hours'`),
    pool.query(`SELECT COUNT(DISTINCT visitor) FROM page_views`),
    pool.query(`SELECT COUNT(DISTINCT visitor) FROM page_views WHERE created_at >= NOW() - INTERVAL '24 hours'`),
    pool.query(`SELECT to_char(date_trunc('day', created_at), 'DD/MM') AS d, COUNT(*)::int AS n FROM page_views WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY date_trunc('day', created_at) ORDER BY date_trunc('day', created_at)`),
    pool.query(`SELECT path, COUNT(*)::int AS n FROM page_views WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY path ORDER BY n DESC LIMIT 10`),
    pool.query(`SELECT COALESCE(device,'?') AS device, COUNT(*)::int AS n FROM page_views GROUP BY device ORDER BY n DESC`),
    pool.query(`SELECT referrer, COUNT(*)::int AS n FROM page_views WHERE referrer IS NOT NULL GROUP BY referrer ORDER BY n DESC LIMIT 8`),
  ]);

  return NextResponse.json({
    users: {
      total: parseInt(usersTotal.rows[0].count),
      today: parseInt(usersToday.rows[0].count),
      google: parseInt(usersGoogle.rows[0].count),
    },
    reports: {
      total: parseInt(reportsTotal.rows[0].count),
      today: parseInt(reportsToday.rows[0].count),
      rojo: parseInt(reportsRojo.rows[0].count),
    },
    persons: {
      total: parseInt(personsTotal.rows[0].count),
      found: parseInt(personsFound.rows[0].count),
    },
    checkins: {
      total: parseInt(checkinsTotal.rows[0].count),
      today: parseInt(checkinsToday.rows[0].count),
    },
    chats: { total: parseInt(chatsTotal.rows[0].count) },
    mod_blocks: {
      total: parseInt(modTotal.rows[0].count),
      today: parseInt(modToday.rows[0].count),
    },
    recent_users: recentUsers.rows,
    recent_reports: recentReports.rows,
    traffic: {
      views_total: parseInt(viewsTotal.rows[0].count),
      views_today: parseInt(viewsToday.rows[0].count),
      visitors_total: parseInt(visUnique.rows[0].count),
      visitors_today: parseInt(visToday.rows[0].count),
      by_day: viewsByDay.rows,
      top_paths: topPaths.rows,
      devices: devices.rows,
      referrers: referrers.rows,
    },
  });
}
