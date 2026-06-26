import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import ReportActions from './ReportActions';

const CAT: Record<string, { icon: string; label: string }> = {
  collapsed_building: { icon: '🏚️', label: 'Edificio colapsado' }, damaged_building: { icon: '🏢', label: 'Edificio dañado' },
  trapped_people: { icon: '🆘', label: 'Personas atrapadas' }, fire: { icon: '🔥', label: 'Incendio' }, gas_leak: { icon: '⛽', label: 'Fuga de gas' },
  blocked_road: { icon: '🚧', label: 'Vía bloqueada' }, flooding: { icon: '🌊', label: 'Inundación' }, medical_need: { icon: '🚑', label: 'Necesidad médica' },
  shelter: { icon: '🏕️', label: 'Refugio' }, water_point: { icon: '💧', label: 'Punto de agua' }, aid_point: { icon: '📦', label: 'Centro de acopio' },
};
const SEV: Record<string, { l: string; c: string }> = { rojo: { l: 'Colapso / crítico', c: '#DC2626' }, naranja: { l: 'Severo', c: '#EA580C' }, amarillo: { l: 'Dañado', c: '#EAB308' }, verde: { l: 'Leve', c: '#16A34A' } };
const VER: Record<string, string> = { official_verified: '✅ Verificado oficial', community_confirmed: '👥 Confirmado por comunidad', unverified: '⌛ Sin verificar' };

async function getReport(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const r = await pool.query(
    `SELECT id, category, severity, resource_status, verification, title, description, lat_pub, lng_pub,
            municipio, parroquia, building_type, people_trapped_count, source_url, image_url, created_at
     FROM hazard_reports WHERE id = $1 AND deleted_at IS NULL`, [id]);
  return r.rows[0] || null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const rep = await getReport(id);
  if (!rep) return { title: 'Reporte no encontrado' };
  const cat = CAT[rep.category]?.label || rep.category;
  const title = rep.title || cat;
  const desc = (rep.description || `${cat} en ${[rep.parroquia, rep.municipio].filter(Boolean).join(', ') || 'Venezuela'}.`).slice(0, 160);
  return {
    title, description: desc, alternates: { canonical: `/reporte/${id}` },
    openGraph: { title: `${title} · SOS Venezuela 2026`, description: desc, url: `https://sosvenezuela2026.com/reporte/${id}`, images: rep.image_url ? [rep.image_url] : undefined },
  };
}

export default async function ReportePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rep = await getReport(id);
  if (!rep) notFound();

  const [comments, reactions] = await Promise.all([
    pool.query(`SELECT rc.body, rc.created_at, u.full_name FROM report_comment rc JOIN users u ON u.id = rc.user_id WHERE rc.report_id = $1 AND rc.hidden = false ORDER BY rc.created_at DESC LIMIT 50`, [id]),
    pool.query(`SELECT kind, count(*)::int AS n FROM report_reaction WHERE report_id = $1 GROUP BY kind`, [id]),
  ]);
  const rc: Record<string, number> = {}; reactions.rows.forEach(r => { rc[r.kind] = r.n; });
  const cat = CAT[rep.category] || { icon: '📌', label: rep.category };
  const sev = rep.severity ? SEV[rep.severity] : null;
  const loc = [rep.parroquia, rep.municipio].filter(Boolean).join(', ');
  const maps = `https://www.google.com/maps/search/?api=1&query=${rep.lat_pub},${rep.lng_pub}`;
  const when = new Date(rep.created_at).toLocaleString('es-VE', { dateStyle: 'long', timeStyle: 'short' });

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        <Link href="/#mapa" className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>← Volver al mapa</Link>

        <div className="rounded-3xl overflow-hidden mt-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
          {rep.image_url && (
            <div className="relative w-full" style={{ aspectRatio: '16/10', background: '#0B1220', overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rep.image_url} alt={rep.title || cat.label} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'blur(18px) brightness(0.6)', transform: 'scale(1.2)' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rep.image_url} alt={rep.title || cat.label} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-contain" />
            </div>
          )}
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#F0FDFA', color: '#0F766E' }}>{cat.icon} {cat.label}</span>
              {sev && <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: sev.c }}>{sev.l}</span>}
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>{VER[rep.verification] || rep.verification}</span>
            </div>

            <h1 className="font-display text-2xl font-extrabold mb-2" style={{ color: 'var(--text-1)' }}>{rep.title || cat.label}</h1>
            <a href={maps} target="_blank" rel="noopener noreferrer" className="text-sm font-medium inline-block mb-3" style={{ color: 'var(--primary)' }}>
              📍 {loc || 'Ubicación aproximada'} · cómo llegar (Maps) ↗
            </a>

            {rep.description && <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-2)' }}>{rep.description}</p>}

            {(rep.building_type || rep.people_trapped_count) && (
              <div className="flex flex-wrap gap-3 text-xs mb-3" style={{ color: 'var(--text-2)' }}>
                {rep.building_type && <span>🏗️ {rep.building_type}</span>}
                {rep.people_trapped_count ? <span style={{ color: '#DC2626', fontWeight: 700 }}>🆘 {rep.people_trapped_count} atrapados reportados</span> : null}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs mb-4" style={{ color: 'var(--text-3)' }}>
              <span>🕒 {when}</span>
              {(rc.confirmo ?? 0) > 0 && <span style={{ color: '#15803D' }}>✅ {rc.confirmo} confirman</span>}
              {(rc.disputo ?? 0) > 0 && <span style={{ color: '#B91C1C' }}>❌ {rc.disputo} dudan</span>}
              {rep.source_url && <a href={rep.source_url} target="_blank" rel="noopener noreferrer" className="font-bold px-2.5 py-1 rounded-lg" style={{ background: '#F0FDFA', color: 'var(--primary)' }}>🔗 Ver fuente</a>}
            </div>

            <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <ReportActions id={rep.id} />
            </div>
          </div>
        </div>

        {comments.rows.length > 0 && (
          <div className="rounded-3xl p-5 mt-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="font-display font-bold text-sm mb-3" style={{ color: 'var(--text-1)' }}>Aportes de la comunidad ({comments.rows.length})</div>
            <div className="space-y-3">
              {comments.rows.map((c, i) => (
                <div key={i} className="text-sm">
                  <span className="font-semibold" style={{ color: 'var(--text-1)' }}>{c.full_name || 'Anónimo'}</span>
                  <span className="text-[11px] ml-2" style={{ color: 'var(--text-3)' }}>{new Date(c.created_at).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <p style={{ color: 'var(--text-2)' }}>{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          <Link href="/#mapa" className="text-sm font-semibold px-5 py-2.5 rounded-xl inline-block" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)' }}>Ver mapa completo →</Link>
        </div>
      </div>
    </div>
  );
}
