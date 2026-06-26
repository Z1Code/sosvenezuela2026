'use client';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSse, HazardEvent } from '../sse-provider';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center" style={{ background: '#dde4ea' }}><span className="text-xs" style={{ color: '#64748B' }}>Cargando mapa…</span></div>,
});

const SEV_COLORS: Record<string, string> = { rojo: '#DC2626', naranja: '#EA580C', amarillo: '#EAB308', verde: '#16A34A' };
const SEV_LABELS: Record<string, string> = { rojo: 'Colapso', naranja: 'Severo', amarillo: 'Dañado', verde: 'Leve' };
const CAT_META: Record<string, { icon: string; label: string }> = {
  collapsed_building: { icon: '🏚️', label: 'Edificio colapsado' }, damaged_building: { icon: '🏢', label: 'Edificio dañado' },
  trapped_people: { icon: '🆘', label: 'Personas atrapadas' }, fire: { icon: '🔥', label: 'Incendio' }, gas_leak: { icon: '⛽', label: 'Fuga de gas' },
  blocked_road: { icon: '🚧', label: 'Vía bloqueada' }, flooding: { icon: '🌊', label: 'Inundación' }, medical_need: { icon: '🚑', label: 'Necesidad médica' },
  shelter: { icon: '🏕️', label: 'Refugio' }, water_point: { icon: '💧', label: 'Punto de agua' }, aid_point: { icon: '📦', label: 'Centro de acopio' },
};
const FILTERS: { v: string; l: string }[] = [
  { v: '', l: 'Todos' }, { v: 'collapsed_building', l: '🏚️ Colapsos' }, { v: 'damaged_building', l: '🏢 Dañados' },
  { v: 'aid_point', l: '📦 Acopios' }, { v: 'shelter', l: '🏕️ Refugios' }, { v: 'gas_leak', l: '⛽ Gas' },
  { v: 'trapped_people', l: '🆘 Atrapados' }, { v: 'blocked_road', l: '🚧 Vías' },
];

export default function ReportesPage() {
  const [reports, setReports] = useState<HazardEvent[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [fly, setFly] = useState<{ id: string; lat: number; lng: number; nonce: number } | null>(null);
  const { hazards } = useSse();

  useEffect(() => { fetch('/api/reports').then(r => r.json()).then(d => Array.isArray(d) && setReports(d)).catch(() => {}); }, []);

  const all = useMemo(() => {
    const ids = new Set(reports.map(r => r.id));
    return [...reports, ...hazards.filter(h => !ids.has(h.id))];
  }, [reports, hazards]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return all.filter(r => {
      if (cat && r.category !== cat) return false;
      if (qq && !((r.title || '').toLowerCase().includes(qq) || (r.municipio || '').toLowerCase().includes(qq) || (r.parroquia || '').toLowerCase().includes(qq))) return false;
      return true;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [all, q, cat]);

  function focus(r: HazardEvent) {
    if (typeof r.lat_pub === 'number') setFly({ id: r.id, lat: r.lat_pub, lng: r.lng_pub, nonce: Date.now() });
    if (typeof window !== 'undefined' && window.innerWidth < 1024) document.getElementById('mapwrap')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div>
            <Link href="/" className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>← Inicio</Link>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block live-dot" /> Mapa y reportes de daños
            </h1>
          </div>
          <div className="text-sm font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--primary)' }}>{filtered.length} reportes</div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.v} onClick={() => setCat(f.v)} className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: cat === f.v ? 'var(--primary)' : 'var(--surface)', color: cat === f.v ? '#fff' : 'var(--text-2)', border: '1px solid var(--border)' }}>{f.l}</button>
          ))}
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por título o zona…"
          className="w-full rounded-2xl px-4 py-2.5 text-sm outline-none mb-4" style={{ border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1)' }} />

        <div className="grid lg:grid-cols-5 gap-4">
          {/* MAPA */}
          <div id="mapwrap" className="lg:col-span-3 order-1">
            <div className="rounded-3xl overflow-hidden lg:sticky lg:top-4 h-[55vh] lg:h-[78vh]"
              style={{ position: 'relative', zIndex: 0, isolation: 'isolate', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
              <MapView initialReports={reports} flyTo={fly} onReportClick={focus} />
            </div>
          </div>

          {/* LISTA */}
          <div className="lg:col-span-2 order-2 space-y-2 lg:max-h-[78vh] lg:overflow-y-auto lg:pr-1">
            {filtered.length === 0 && <p className="text-sm text-center py-10" style={{ color: 'var(--text-3)' }}>Sin reportes para este filtro.</p>}
            {filtered.slice(0, 300).map(r => {
              const m = CAT_META[r.category] || { icon: '📌', label: r.category };
              const color = r.severity ? SEV_COLORS[r.severity] : 'var(--primary)';
              return (
                <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => focus(r)} role="button"
                  className="rounded-2xl p-3 flex gap-3 cursor-pointer" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  {r.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" style={{ background: '#EEF2F7' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: 'var(--surface-2)' }}>{m.icon}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: '#F0FDFA', color: '#0F766E' }}>{m.label}</span>
                      {r.severity && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: SEV_COLORS[r.severity] }}>{SEV_LABELS[r.severity]}</span>}
                    </div>
                    <div className="text-sm font-semibold leading-tight line-clamp-1" style={{ color: 'var(--text-1)' }}>{r.title || m.label}</div>
                    <div className="text-[11px] line-clamp-1" style={{ color: 'var(--text-3)' }}>📍 {[r.parroquia, r.municipio].filter(Boolean).join(', ') || 'Ubicación aproximada'}</div>
                  </div>
                  <Link href={`/reporte/${r.id}`} onClick={e => e.stopPropagation()} className="self-center text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0" style={{ color: 'var(--primary)', background: 'rgba(13,148,136,0.08)' }}>ver →</Link>
                </motion.div>
              );
            })}
            {filtered.length > 300 && <p className="text-[11px] text-center py-3" style={{ color: 'var(--text-3)' }}>Mostrando 300 de {filtered.length}. Usa los filtros para acotar.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
