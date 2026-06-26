'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import Link from 'next/link';
import { useSse, HazardEvent, ChatEvent } from './sse-provider';
import TweetFeed from '@/components/TweetFeed';
import FoundCarousel from '@/components/FoundCarousel';
import NewsSection from '@/components/NewsSection';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: '#dde4ea' }}>
      <div className="text-center">
        <div className="w-8 h-8 rounded-full border-4 animate-spin mx-auto mb-2"
          style={{ borderColor: '#E2E8F0', borderTopColor: '#0D9488' }} />
        <p className="text-xs" style={{ color: '#64748B' }}>Cargando mapa…</p>
      </div>
    </div>
  )
});

/* ── helpers ───────────────────────────────────── */
function AnimatedNumber({ value, duration = 750 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current, to = value; prev.current = value;
    if (from === to) { setDisplay(to); return; }
    let raf = 0; const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display}</>;
}

function useNow(intervalMs = 15000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
function timeAgo(date: string, now: number) {
  const s = Math.max(0, Math.floor((now - new Date(date).getTime()) / 1000));
  if (s < 20) return 'ahora mismo';
  if (s < 60) return `hace ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

const SEV_COLORS: Record<string, string> = { rojo: '#DC2626', naranja: '#EA580C', amarillo: '#EAB308', verde: '#16A34A' };
const SEV_LABELS: Record<string, string> = { rojo: 'Colapso', naranja: 'Severo', amarillo: 'Dañado', verde: 'Seguro' };
const CAT_META: Record<string, { icon: string; label: string }> = {
  collapsed_building: { icon: '🏚️', label: 'Edificio colapsado' },
  damaged_building: { icon: '🏢', label: 'Edificio dañado' },
  trapped_people: { icon: '🆘', label: 'Personas atrapadas' },
  fire: { icon: '🔥', label: 'Incendio' },
  gas_leak: { icon: '⛽', label: 'Fuga de gas' },
  blocked_road: { icon: '🚧', label: 'Vía bloqueada' },
  flooding: { icon: '🌊', label: 'Inundación' },
  medical_need: { icon: '🚑', label: 'Necesidad médica' },
  shelter: { icon: '🏕️', label: 'Refugio' },
  water_point: { icon: '💧', label: 'Punto de agua' },
  aid_point: { icon: '📦', label: 'Punto de ayuda' },
};

/* Crisp CSS Venezuelan flag — renders identically on every OS. */
function FlagVE({ size = 28 }: { size?: number }) {
  return (
    <span aria-label="Venezuela" role="img"
      style={{
        display: 'inline-block', width: size, height: Math.round(size * 0.68),
        borderRadius: 5, flexShrink: 0, verticalAlign: 'middle',
        background: 'linear-gradient(#FFCC00 0 33.33%, #00247D 33.33% 66.66%, #CF142B 66.66% 100%)',
        boxShadow: '0 1px 2px rgba(11,18,32,0.18)', border: '1px solid rgba(11,18,32,0.08)',
      }} />
  );
}

type FlyTarget = { id: string; lat: number; lng: number; nonce: number } | null;

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const rise: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 130, damping: 18 } } };

export default function LandingPage() {
  const [reports, setReports] = useState<HazardEvent[]>([]);
  const [tab, setTab] = useState<'mapa' | 'primeros'>('mapa');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<HazardEvent | null>(null);
  const [fly, setFly] = useState<FlyTarget>(null);
  const [authed, setAuthed] = useState(false);
  const [pstats, setPstats] = useState<{ missing: number; found: number; total: number } | null>(null);
  const { hazards, presence, checkins } = useSse();

  const navLinks = [
    { href: '/reportes', label: 'Mapa y reportes' },
    { href: '/buscar', label: 'Buscar persona' },
    { href: '/validar', label: 'Validar daños' },
    { href: '/noticias', label: 'Noticias' },
    { href: '/recomendaciones', label: 'Primeros auxilios' },
    { href: '/acerca', label: 'Acerca' },
  ];

  useEffect(() => {
    fetch('/api/reports').then(r => r.json()).then(d => Array.isArray(d) && setReports(d)).catch(() => {});
    fetch('/api/me').then(r => r.json()).then(d => setAuthed(!!d.user)).catch(() => {});
    fetch('/api/persons/stats').then(r => r.json()).then(setPstats).catch(() => {});
  }, []);

  const allReports = useMemo(() => {
    const ids = new Set(reports.map(r => r.id));
    return [...reports, ...hazards.filter(h => !ids.has(h.id))];
  }, [reports, hazards]);

  // El home muestra solo sucesos/estructuras; recursos (acopios, refugios, agua)
  // quedan para la página de detalle /reportes.
  const RESOURCE_CATS = ['aid_point', 'shelter', 'water_point'];
  const structureReports = useMemo(() => allReports.filter(r => !RESOURCE_CATS.includes(r.category)), [allReports]);

  const bySev = useMemo(() => {
    const c: Record<string, number> = { rojo: 0, naranja: 0, amarillo: 0, verde: 0, recurso: 0 };
    allReports.forEach(r => { if (r.severity && c[r.severity] !== undefined) c[r.severity]++; else c.recurso++; });
    return c;
  }, [allReports]);

  function focusReport(r: HazardEvent) {
    setSelected(r);
    setTab('mapa');
    if (typeof r.lat_pub === 'number' && typeof r.lng_pub === 'number') {
      setFly({ id: r.id, lat: r.lat_pub, lng: r.lng_pub, nonce: Date.now() });
    }
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      document.getElementById('mapa')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  const liveStats = [
    { icon: '📍', value: structureReports.length, label: 'Reportes', color: '#0D9488' },
    { icon: '🔴', value: bySev.rojo + bySev.naranja, label: 'Críticos', color: '#DC2626' },
    { icon: '👥', value: presence, label: 'En línea', color: '#0EA5E9' },
  ];

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10">

        {/* ── HEADER + LIVE STATS ─────────────────── */}
        <header className="sticky top-0 z-50 glass" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-5 h-16 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2.5 min-w-0">
              <FlagVE size={30} />
              <div className="min-w-0">
                <div className="font-display font-bold text-sm tracking-tight truncate" style={{ color: 'var(--text-1)' }}>SOS Venezuela 2026</div>
                <div className="text-[10px] flex items-center gap-1.5" style={{ color: '#16A34A' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block live-dot" />
                  {presence} en línea ahora
                </div>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-0.5">
              {navLinks.map(item => (
                <Link key={item.href} href={item.href}
                  className="px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all hover:bg-slate-900/[0.05]"
                  style={{ color: 'var(--text-2)' }}>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden sm:block">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white sheen-card"
                  style={{ background: 'var(--primary)', boxShadow: 'var(--shadow-teal)' }}>
                  Reportar / Buscar
                </motion.div>
              </Link>
              <button onClick={() => setMenuOpen(o => !o)} aria-label="Abrir menú" aria-expanded={menuOpen}
                className="md:hidden flex items-center justify-center w-11 h-11 rounded-xl transition-colors"
                style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)', color: 'var(--text-1)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  {menuOpen
                    ? <><line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" /></>
                    : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
                </svg>
              </button>
            </div>
          </div>

          {/* LIVE STATS STRIP (centered) */}
          <div style={{ borderTop: '1px solid var(--border-soft)', background: 'rgba(255,255,255,0.45)' }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-5 py-2 flex items-center justify-center flex-wrap gap-2 sm:gap-2.5">
              <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider flex-shrink-0 pr-1"
                style={{ color: '#16A34A' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block live-dot" /> En vivo
              </span>
              {liveStats.map(s => (
                <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl flex-shrink-0"
                  style={{ background: '#fff', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <span className="text-sm">{s.icon}</span>
                  <span className="font-display font-extrabold text-[15px] tabular-nums" style={{ color: s.color }}>
                    <AnimatedNumber value={s.value} />
                  </span>
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>{s.label}</span>
                </div>
              ))}
              {pstats && (
                <Link href="/buscar" className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl flex-shrink-0 transition-transform hover:scale-105"
                  style={{ background: '#fff', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <span className="text-sm">🕊️</span>
                  <span className="font-display font-extrabold text-[15px] tabular-nums" style={{ color: '#DC2626' }}>
                    <AnimatedNumber value={pstats.missing} />
                  </span>
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>Desaparecidos</span>
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--primary)' }}>buscar →</span>
                </Link>
              )}
              {pstats && pstats.found > 0 && (
                <Link href="/buscar" className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl flex-shrink-0 transition-transform hover:scale-105"
                  style={{ background: '#fff', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <span className="text-sm">✅</span>
                  <span className="font-display font-extrabold text-[15px] tabular-nums" style={{ color: '#16A34A' }}>
                    <AnimatedNumber value={pstats.found} />
                  </span>
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>Encontrados</span>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile dropdown */}
          <AnimatePresence>
            {menuOpen && (
              <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="md:hidden overflow-hidden glass" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="px-4 py-3 space-y-1">
                  {navLinks.map(item => (
                    <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                      className="block px-3 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-slate-900/[0.04]"
                      style={{ color: 'var(--text-1)' }}>
                      {item.label}
                    </Link>
                  ))}
                  <Link href="/login" onClick={() => setMenuOpen(false)}
                    className="block px-3 py-3 rounded-xl text-sm font-semibold text-center text-white mt-2"
                    style={{ background: 'var(--primary)', boxShadow: 'var(--shadow-teal)' }}>
                    Reportar / Buscar persona
                  </Link>
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
        </header>

        {/* ── COMPACT HERO ────────────────────────── */}
        <motion.section variants={stagger} initial="hidden" animate="show"
          className="px-4 pt-8 pb-6 text-center max-w-3xl mx-auto">
          <motion.h1 variants={rise}
            className="font-display text-[2.25rem] leading-[1.05] sm:text-5xl font-extrabold mb-4"
            style={{ color: 'var(--text-1)' }}>
            Red de apoyo <span className="shimmer-text">ciudadana en vivo</span>
          </motion.h1>
          <motion.p variants={rise}
            className="text-[15px] sm:text-base mb-6 max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Reporta daños y busca personas en el mapa en tiempo real.
            <strong style={{ color: 'var(--text-1)' }}> Tu ubicación exacta nunca se comparte.</strong>
          </motion.p>
          <motion.div variants={rise} className="grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {[
              { href: '/reportar', icon: '📍', label: 'Reportar un daño', sub: 'Edificios, gas, vías…', grad: 'linear-gradient(135deg,#0D9488,#0F766E)', glow: '0 12px 30px -8px rgba(13,148,136,0.55)' },
              { href: '/buscar', icon: '🔎', label: 'Buscar persona', sub: 'Directorio de desaparecidos', grad: 'linear-gradient(135deg,#0EA5E9,#0369A1)', glow: '0 12px 30px -8px rgba(14,165,233,0.55)' },
              { href: '/validar', icon: '🏗️', label: 'Validar daños', sub: 'Residentes e ingenieros', grad: 'linear-gradient(135deg,#F59E0B,#D97706)', glow: '0 12px 30px -8px rgba(245,158,11,0.6)' },
            ].map(b => (
              <Link key={b.href} href={b.href}>
                <motion.div whileHover={{ scale: 1.04, y: -4 }} whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 17 }}
                  className="flex flex-col items-center justify-center gap-1.5 px-4 py-5 rounded-3xl text-white sheen-card h-full"
                  style={{ background: b.grad, boxShadow: b.glow }}>
                  <span className="flex items-center justify-center w-12 h-12 rounded-2xl text-2xl mb-0.5" style={{ background: 'rgba(255,255,255,0.18)' }}>{b.icon}</span>
                  <span className="font-display font-extrabold text-base leading-tight">{b.label}</span>
                  <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{b.sub}</span>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        </motion.section>

        {/* ── MAP (HERO CENTERPIECE) ──────────────── */}
        <section id="mapa" className="px-4 max-w-6xl mx-auto mb-12 scroll-mt-24">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block live-dot" /> Mapa en vivo
              <Link href="/reportes" className="text-[11px] font-bold px-2.5 py-1 rounded-lg" style={{ color: 'var(--primary)', background: 'rgba(13,148,136,0.08)' }}>Ver todos →</Link>
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                style={{ background: 'rgba(220,38,38,0.07)', color: '#DC2626', border: '1px solid #FECACA' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block live-dot-red" />
                EMERGENCIA ACTIVA · M7.5
              </span>
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                {(['mapa', 'primeros'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className="px-3.5 py-2 text-xs font-semibold transition-all"
                    style={{ background: tab === t ? 'var(--primary)' : '#fff', color: tab === t ? '#fff' : 'var(--text-2)' }}>
                    {t === 'mapa' ? '🗺️ Mapa' : '🩹 Auxilios'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {/* MAP */}
            <div className="lg:col-span-2 rounded-3xl overflow-hidden h-[380px] sm:h-[460px] lg:h-[560px]"
              style={{ position: 'relative', zIndex: 0, isolation: 'isolate', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
              {tab === 'mapa' ? (
                <MapView initialReports={reports} flyTo={fly} onReportClick={focusReport} hide={RESOURCE_CATS} />
              ) : (
                <div className="h-full overflow-y-auto p-5" style={{ background: '#fff' }}>
                  <FirstAidPanel />
                </div>
              )}
              {tab === 'mapa' && (
                <div className="absolute bottom-3 left-3 right-3 z-[400] pointer-events-none">
                  <div className="rounded-xl px-3 py-1.5 text-xs text-center font-medium glass"
                    style={{ color: '#9A3412', border: '1px solid rgba(234,88,12,0.3)' }}>
                    🛡️ Coordenadas aproximadas — protección anti-saqueo activa
                  </div>
                </div>
              )}
            </div>

            {/* SIDEBAR */}
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {selected ? (
                  <ReportDetail key={selected.id} report={selected} authed={authed} onClose={() => setSelected(null)} />
                ) : (
                  <motion.div key="severity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    <div className="font-display text-sm font-bold mb-4" style={{ color: 'var(--text-1)' }}>Estado actual</div>
                    <div className="space-y-3.5">
                      {(['rojo', 'naranja', 'amarillo', 'verde'] as const).map(k => (
                        <div key={k}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span style={{ color: 'var(--text-2)' }}>{SEV_LABELS[k]}</span>
                            <span className="font-bold tabular-nums" style={{ color: SEV_COLORS[k] }}>{bySev[k]}</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                            <motion.div initial={{ width: 0 }}
                              animate={{ width: allReports.length ? `${(bySev[k] / allReports.length) * 100}%` : '0%' }}
                              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                              className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${SEV_COLORS[k]}, ${SEV_COLORS[k]}cc)` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <LiveReportsFeed reports={structureReports} onSelect={focusReport} selectedId={selected?.id} />

              <TweetFeed />

              <AnimatePresence>
                {checkins.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="rounded-3xl p-5 overflow-hidden" style={{ background: 'rgba(240,253,244,0.9)', border: '1px solid #86EFAC' }}>
                    <div className="font-display text-sm font-bold mb-3" style={{ color: '#15803D' }}>🙋 Estoy a salvo</div>
                    {checkins.slice(-3).reverse().map(c => (
                      <div key={c.id} className="text-xs mb-1.5">
                        <span className="font-semibold" style={{ color: '#166534' }}>{c.full_name || 'Alguien'}</span>
                        {c.estado && <span style={{ color: '#16A34A' }}> desde {c.estado}</span>}
                        {c.msg && <span style={{ color: '#15803D' }}> · &ldquo;{c.msg}&rdquo;</span>}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* ── PERSONAS ENCONTRADAS (carrusel) ─────── */}
        <FoundCarousel />

        {/* ── NOTICIAS ──────────────────────────────── */}
        <NewsSection />

        {/* ── CHAT COMUNITARIO (debajo del mapa) ──── */}
        <section className="px-4 max-w-6xl mx-auto mb-12">
          <ChatPanel authed={authed} />
        </section>

        {/* ── SISMOS DETAIL ───────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
          className="px-4 max-w-6xl mx-auto mb-12">
          <div className="rounded-2xl p-4 sm:p-5" style={{ background: 'rgba(254,242,242,0.85)', border: '1px solid #FECACA', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex flex-wrap gap-4 items-start">
              <div className="text-3xl">⚠️</div>
              <div className="flex-1 min-w-[220px]">
                <div className="font-display font-bold text-sm mb-1.5" style={{ color: '#991B1B' }}>Doble sismo del 24 de junio de 2026 — datos USGS</div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs" style={{ color: '#DC2626' }}>
                  <div><strong>Sismo 1:</strong> M7.1 · 17:04 VET · ~Yumare (Yaracuy)</div>
                  <div><strong>Sismo 2:</strong> M7.5 · 17:05 VET · Morón / Puerto Cabello</div>
                </div>
                <div className="text-xs mt-1.5" style={{ color: '#B91C1C' }}>
                  Se esperan réplicas. Mantente alejado de estructuras dañadas. Emergencias: <strong>171</strong>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── BALANCE DE CIFRAS ───────────────────── */}
        <section className="px-4 max-w-6xl mx-auto mb-12">
          <BalancePanel />
        </section>

        {/* ── CTAs ───────────────────────────────── */}
        <section className="px-4 max-w-6xl mx-auto mb-12">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}
            className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: '📍', title: 'Reportar daño', desc: 'Marca edificios colapsados, fugas de gas, vías bloqueadas o personas atrapadas.', href: '/reportar', color: '#0D9488', bg: 'rgba(240,253,250,0.9)' },
              { icon: '🔎', title: 'Buscar persona', desc: 'Busca a un familiar por cédula, teléfono o nombre. Activa avisos en tiempo real.', href: '/buscar', color: '#0EA5E9', bg: 'rgba(240,249,255,0.9)' },
              { icon: '🩹', title: 'Primeros auxilios', desc: '12 guías basadas en Cruz Roja, OMS y FEMA. Disponibles sin conexión.', href: '/recomendaciones', color: '#7C3AED', bg: 'rgba(245,243,255,0.9)' },
            ].map(item => (
              <motion.div key={item.href} variants={rise}>
                <Link href={item.href}>
                  <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="rounded-3xl p-6 h-full cursor-pointer sheen-card"
                    style={{ background: item.bg, border: `1px solid ${item.color}22`, boxShadow: 'var(--shadow-sm)' }}>
                    <div className="text-3xl mb-3">{item.icon}</div>
                    <div className="font-display font-bold text-lg mb-2" style={{ color: 'var(--text-1)' }}>{item.title}</div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{item.desc}</p>
                    <div className="mt-4 text-xs font-bold" style={{ color: item.color }}>
                      {item.href === '/recomendaciones' ? 'Ver guías →' : 'Ir →'}
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── FIRST AID PREVIEW ──────────────────── */}
        <section className="px-4 max-w-6xl mx-auto mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Primeros auxilios — más urgentes</h2>
            <Link href="/recomendaciones" className="text-xs font-bold whitespace-nowrap" style={{ color: 'var(--primary)' }}>Ver las 12 guías →</Link>
          </div>
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: '🏠', title: 'Durante el sismo', tip: 'Agáchate, cúbrete y agárrate. El "triángulo de la vida" es un MITO peligroso.' },
              { icon: '🩸', title: 'Hemorragias', tip: 'Presión directa firme. Si traspasa, añade tela encima — no retires la primera.' },
              { icon: '❤️', title: 'RCP', tip: '100–120 compresiones/min, 5 cm profundidad. No pares hasta que llegue ayuda.' },
              { icon: '🆘', title: 'Si quedas atrapado', tip: 'Golpea tuberías, no grites. No enciendas fuego (posible fuga de gas).' },
            ].map(item => (
              <motion.div key={item.icon} variants={rise}>
                <Link href="/recomendaciones">
                  <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="rounded-2xl p-4 h-full cursor-pointer sheen-card"
                    style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="font-display font-semibold text-sm mb-1.5" style={{ color: 'var(--text-1)' }}>{item.title}</div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{item.tip}</p>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── FOOTER ─────────────────────────────── */}
        <footer className="px-4 py-9 max-w-6xl mx-auto" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FlagVE size={30} />
              <div>
                <div className="font-display font-bold text-sm" style={{ color: 'var(--text-1)' }}>SOS Venezuela 2026</div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>sosvenezuela2026.com · Uso humanitario · Sin fines comerciales</div>
              </div>
            </div>
            <div className="rounded-2xl px-4 py-2 text-center" style={{ background: '#FEF9C3' }}>
              <div className="text-[11px] font-medium" style={{ color: '#713F12' }}>Emergencias Venezuela</div>
              <div className="font-display text-2xl font-extrabold" style={{ color: '#DC2626' }}>171</div>
            </div>
            <div className="flex gap-4 text-xs" style={{ color: 'var(--text-3)' }}>
              <Link href="/privacidad" className="hover:underline">Privacidad</Link>
              <Link href="/acerca" className="hover:underline">Acerca</Link>
              <Link href="/login" className="hover:underline">Ingresar</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ── SELECTED REPORT DETAIL + CONFIRM/DENY ─────── */
function ReportDetail({ report, authed, onClose }: { report: HazardEvent; authed: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<null | 'confirmo' | 'disputo'>(null);
  const [reason, setReason] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [err, setErr] = useState('');
  const meta = CAT_META[report.category] || { icon: '📌', label: report.category };
  const color = report.severity ? SEV_COLORS[report.severity] : '#0D9488';
  const loginUrl = `/login?redirect=${encodeURIComponent('/')}`;

  async function submit() {
    if (!authed) { window.location.href = loginUrl; return; }
    if (mode === 'disputo' && !reason.trim()) { setErr('Explica brevemente por qué dudas del reporte.'); return; }
    setState('sending'); setErr('');
    try {
      const r = await fetch('/api/reactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: report.id, kind: mode }),
      });
      if (r.status === 401) { window.location.href = loginUrl; return; }
      if (!r.ok) throw new Error();
      if (reason.trim()) {
        const c = await fetch('/api/comments', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report_id: report.id, body: reason.trim() }),
        });
        if (c.status === 422) { setErr((await c.json()).error); setState('error'); return; }
      }
      setState('done');
    } catch { setErr('No se pudo registrar tu aporte.'); setState('error'); }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="rounded-3xl p-5" style={{ background: '#fff', border: `1px solid ${color}33`, boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide" style={{ color }}>
          <span className="text-base">{meta.icon}</span>{meta.label}
        </div>
        <button onClick={onClose} aria-label="Cerrar" className="text-lg leading-none -mt-1" style={{ color: 'var(--text-3)' }}>×</button>
      </div>
      {report.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={report.image_url} alt={report.title || meta.label} loading="lazy" referrerPolicy="no-referrer"
          className="w-full h-32 object-cover rounded-xl mb-2.5"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      )}
      <div className="font-display font-bold text-base mb-1" style={{ color: 'var(--text-1)' }}>{report.title || meta.label}</div>
      <div className="text-[11px] mb-2" style={{ color: 'var(--text-3)' }}>
        {report.municipio || ''}{report.parroquia ? ` · ${report.parroquia}` : ''}
      </div>
      {report.verification === 'official_verified' && (
        <div className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2" style={{ background: '#F0FDF4', color: '#15803D' }}>✅ Verificado oficial</div>
      )}
      {report.description && <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-2)' }}>{report.description}</p>}
      {report.source_url && (
        <a href={report.source_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg mb-3"
          style={{ background: '#F0FDFA', color: 'var(--primary)' }}>
          🔗 Ver fuente
        </a>
      )}

      {state === 'done' ? (
        <div className="text-xs rounded-xl px-3 py-2.5 font-medium" style={{ background: '#F0FDF4', color: '#15803D' }}>
          ✅ ¡Gracias! Tu aporte ayuda a verificar este reporte.
        </div>
      ) : (
        <>
          <div className="text-[11px] font-semibold mb-2" style={{ color: 'var(--text-2)' }}>¿Puedes verificar este suceso?</div>
          <div className="flex gap-2 mb-2">
            <button onClick={() => { setMode('confirmo'); setErr(''); }}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
              style={mode === 'confirmo' ? { background: '#16A34A', color: '#fff' } : { background: '#F0FDF4', color: '#15803D', border: '1px solid #86EFAC' }}>
              ✅ Confirmar
            </button>
            <button onClick={() => { setMode('disputo'); setErr(''); }}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
              style={mode === 'disputo' ? { background: '#DC2626', color: '#fff' } : { background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
              ❌ Negar
            </button>
          </div>

          <AnimatePresence>
            {mode && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} maxLength={200}
                  placeholder={mode === 'confirmo' ? 'Añade contexto (opcional): qué viste, estado actual…' : 'Explica por qué dudas del reporte (requerido)'}
                  className="w-full rounded-xl px-3 py-2 text-xs outline-none resize-none mt-1"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)' }} />
                {!authed && <div className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>🔒 Necesitas iniciar sesión para enviar.</div>}
                {err && <div className="text-[11px] mt-1" style={{ color: '#DC2626' }}>{err}</div>}
                <button onClick={submit} disabled={state === 'sending'}
                  className="w-full mt-2 py-2.5 rounded-xl text-xs font-bold text-white transition-opacity"
                  style={{ background: state === 'sending' ? '#94A3B8' : 'var(--primary)' }}>
                  {state === 'sending' ? 'Enviando…' : authed ? 'Enviar aporte' : 'Iniciar sesión para enviar'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

/* ── BALANCE DE LA EMERGENCIA (en vivo + oficial) ── */
interface BalanceData {
  live: { collapsed: number; aftershocks: number | null; maxAfter: number | null; updated_at: string };
  official: Record<string, { value: string; label: string; updated_at: string }>;
  official_updated: string | null;
}
function BalancePanel() {
  const [b, setB] = useState<BalanceData | null>(null);
  useEffect(() => { fetch('/api/balance').then(r => r.json()).then(setB).catch(() => {}); }, []);
  const o = b?.official || {};
  const prelim = [
    { label: o.fallecidos_estimados?.label || 'Fallecidos (estimación USGS PAGER)', value: o.fallecidos_estimados?.value || '—' },
    { label: 'Edificios colapsados (reportes)', value: b ? String(b.live.collapsed) : '…' },
    { label: 'Réplicas (USGS M≥2.5)', value: b?.live?.aftershocks != null ? `${b.live.aftershocks}${b.live.maxAfter ? ` · máx M${b.live.maxAfter.toFixed(1)}` : ''}` : '…' },
  ];
  const conf = [
    { label: o.fallecidos_confirmados?.label || 'Fallecidos confirmados', value: o.fallecidos_confirmados?.value || '—' },
    { label: o.estado_emergencia?.label || 'Estado de emergencia', value: o.estado_emergencia?.value || '—' },
    { label: o.aeropuerto?.label || 'Aeropuerto Maiquetía', value: o.aeropuerto?.value || '—' },
  ];
  const oficialFecha = b?.official_updated ? new Date(b.official_updated).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
  const Row = ({ tag, tagColor, tagBg, items }: { tag: string; tagColor: string; tagBg: string; items: { label: string; value: string }[] }) => (
    <div className="flex flex-wrap items-center gap-2.5 py-3">
      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0"
        style={{ background: tagBg, color: tagColor }}>{tag}</span>
      {items.map(it => (
        <div key={it.label} className="flex items-baseline gap-1.5">
          <span className="font-display font-extrabold text-sm tabular-nums" style={{ color: 'var(--text-1)' }}>{it.value}</span>
          <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
  return (
    <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display text-base font-bold" style={{ color: 'var(--text-1)' }}>📊 Balance de la emergencia</h2>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--primary)' }}>en vivo</span>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
        <Row tag="Preliminares" tagColor="#9A3412" tagBg="rgba(234,88,12,0.12)" items={prelim} />
        <Row tag="Confirmadas" tagColor="#15803D" tagBg="rgba(22,163,74,0.12)" items={conf} />
      </div>
      <p className="text-[10px] mt-2 leading-relaxed" style={{ color: 'var(--text-3)' }}>
        Edificios colapsados y réplicas se actualizan automáticamente (nuestros reportes · USGS).
        Cifras confirmadas{oficialFecha ? ` (al ${oficialFecha})` : ''} = fuentes oficiales o medios verificados.
        Las cifras pueden cambiar conforme avancen las labores de rescate.
      </p>
    </div>
  );
}

/* ── CHAT COMUNITARIO ──────────────────────────── */
function ChatPanel({ authed }: { authed: boolean }) {
  const { chats } = useSse();
  const [initial, setInitial] = useState<ChatEvent[]>([]);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const now = useNow(20000);
  const loginUrl = `/login?redirect=${encodeURIComponent('/')}`;

  useEffect(() => {
    fetch('/api/chat').then(r => r.json()).then(d => Array.isArray(d) && setInitial(d)).catch(() => {});
  }, []);

  const messages = useMemo(() => {
    const seen = new Set<string>(); const out: ChatEvent[] = [];
    for (const m of [...initial, ...chats]) { if (m && !seen.has(m.id)) { seen.add(m.id); out.push(m); } }
    return out;
  }, [initial, chats]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  async function send() {
    if (!authed) { window.location.href = loginUrl; return; }
    if (!text.trim()) return;
    setSending(true); setErr('');
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: text.trim() }) });
      if (res.status === 401) { window.location.href = loginUrl; return; }
      if (res.status === 422) { setErr((await res.json()).error); setSending(false); return; }
      if (!res.ok) { setErr('No se pudo enviar el mensaje.'); setSending(false); return; }
      setText(''); setSending(false);
    } catch { setErr('Error de conexión.'); setSending(false); }
  }

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <div className="font-display text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block live-dot" /> Canal comunitario
        </div>
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>Solo información verificada · sin datos de contacto</span>
      </div>

      <div ref={boxRef} className="px-5 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: 340, minHeight: 180 }}>
        {messages.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>Aún no hay mensajes. Sé el primero en compartir información útil y verificada.</p>
        )}
        {messages.map(m => (
          <div key={m.id} className="flex gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'var(--primary-light)', color: 'var(--primary-deep)' }}>
              {(m.full_name || 'A').trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{m.full_name || 'Anónimo'}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{timeAgo(m.created_at, now)}</span>
              </div>
              <p className="text-sm leading-snug break-words" style={{ color: 'var(--text-2)' }}>{m.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border-soft)', background: 'var(--surface-2)' }}>
        {err && <div className="text-[11px] mb-2 px-2" style={{ color: '#DC2626' }}>{err}</div>}
        <div className="flex gap-2">
          <input value={text} onChange={e => setText(e.target.value)} maxLength={500}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder={authed ? 'Escribe un mensaje…' : 'Inicia sesión para escribir…'}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{ border: '1px solid var(--border)', background: '#fff', color: 'var(--text-1)' }} />
          <button onClick={send} disabled={sending}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex-shrink-0"
            style={{ background: sending ? '#94A3B8' : 'var(--primary)', boxShadow: 'var(--shadow-teal)' }}>
            {sending ? '…' : authed ? 'Enviar' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── LIVE REPORTS FEED ─────────────────────────── */
function LiveReportsFeed({ reports, onSelect, selectedId }: { reports: HazardEvent[]; onSelect: (r: HazardEvent) => void; selectedId?: string }) {
  const now = useNow(15000);
  const reduce = useReducedMotion();
  const latest = useMemo(
    () => [...reports].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6),
    [reports]
  );

  return (
    <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center justify-between mb-3.5">
        <div className="font-display text-sm font-bold" style={{ color: 'var(--text-1)' }}>Últimos reportes</div>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#16A34A' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block live-dot" /> En vivo
        </div>
      </div>

      <motion.div layout className="space-y-1">
        <AnimatePresence mode="popLayout" initial={false}>
          {latest.map(r => {
            const isNew = now - new Date(r.created_at).getTime() < 90_000;
            const isSel = r.id === selectedId;
            const color = r.severity ? SEV_COLORS[r.severity] : 'var(--primary)';
            const meta = CAT_META[r.category] || { icon: '📌', label: r.category };
            return (
              <motion.div key={r.id} layout onClick={() => onSelect(r)} role="button" tabIndex={0}
                initial={{ opacity: 0, y: -14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }}
                whileHover={{ x: 2 }}
                className="w-full text-left flex items-center gap-2.5 rounded-2xl px-2.5 py-2 transition-colors cursor-pointer overflow-hidden"
                style={{ background: isSel ? 'rgba(13,148,136,0.10)' : isNew ? 'rgba(13,148,136,0.05)' : 'transparent' }}>
                <div className="relative flex-shrink-0">
                  <span className="block w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  {isNew && <span className="absolute inset-0 rounded-full live-dot" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-semibold leading-tight truncate min-w-0 flex-1" style={{ color: 'var(--text-1)' }}>
                      <span className="mr-1">{meta.icon}</span>{r.title || meta.label}
                    </span>
                    {isNew && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="flex-shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: 'var(--primary)' }}>NUEVO</motion.span>
                    )}
                  </div>
                  <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>{r.municipio || meta.label} · {timeAgo(r.created_at, now)}</div>
                </div>
                <Link href={`/reporte/${r.id}`} onClick={e => e.stopPropagation()}
                  className="text-[10px] flex-shrink-0 font-bold px-2 py-1 rounded-lg" style={{ color: 'var(--primary)', background: 'rgba(13,148,136,0.08)' }}>ver →</Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {latest.length === 0 && <p className="text-xs text-center py-5" style={{ color: 'var(--text-3)' }}>Esperando reportes…</p>}
      </motion.div>
    </div>
  );
}

/* ── FIRST AID PANEL ───────────────────────────── */
function FirstAidPanel() {
  const items = [
    { icon: '🏠', title: 'Durante el sismo', body: 'AGÁCHATE, CÚBRETE y AGÁRRATE. El "triángulo de la vida" es un MITO — no lo uses. No corras hacia afuera. No uses ascensores.' },
    { icon: '🆘', title: 'Si quedas atrapado', body: 'Golpea tuberías o paredes. Usa un silbato. Grita solo como último recurso. NO enciendas fuego.' },
    { icon: '🩸', title: 'Hemorragias', body: 'Presión directa firme. Si traspasa, añade tela encima. Para brazo/pierna: torniquete 5 cm sobre la herida. Anota la hora.' },
    { icon: '❤️', title: 'RCP', body: '100–120 compresiones/min al centro del pecho, 5 cm profundidad. No pares hasta que llegue ayuda o respire.' },
    { icon: '🦵', title: 'Atrapado > 1 hora', body: 'NO lo liberes súbitamente — riesgo de paro cardíaco. Hidrátalo y espera rescate especializado (síndrome de aplastamiento).' },
    { icon: '💧', title: 'Agua segura', body: 'Hierve 1 minuto o desinfecta con cloro. No bebas agua inundada o cerca de aguas servidas.' },
    { icon: '📞', title: 'Emergencias', body: 'Llama al 171 (Venezuela). Accede a las 12 guías completas en la sección de Primeros Auxilios.' },
  ];
  return (
    <div className="space-y-3">
      <div className="font-display font-bold text-base mb-4" style={{ color: 'var(--text-1)' }}>🩹 Guía rápida de emergencia</div>
      {items.map(item => (
        <div key={item.icon} className="p-3 rounded-2xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{item.icon}</span>
            <span className="font-display font-semibold text-xs" style={{ color: 'var(--text-1)' }}>{item.title}</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{item.body}</p>
        </div>
      ))}
      <Link href="/recomendaciones">
        <div className="w-full py-3 rounded-2xl text-center text-sm font-semibold text-white mt-2" style={{ background: 'var(--primary)', boxShadow: 'var(--shadow-teal)' }}>
          Ver todas las 12 guías completas →
        </div>
      </Link>
    </div>
  );
}
