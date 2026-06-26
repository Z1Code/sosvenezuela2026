'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Sub {
  id: string; zona: string | null; municipio: string | null; building_type: string | null;
  note: string | null; photo_ids: string[]; validations: number;
  habitable_votes: number; inhabitable_votes: number; uncertain_votes: number;
}

// Veredicto comunitario según los votos de ingenieros/arquitectos.
function verdict(s: Sub): { label: string; color: string; bg: string } {
  const h = s.habitable_votes || 0, i = s.inhabitable_votes || 0;
  if (h + i + (s.uncertain_votes || 0) === 0) return { label: '⌛ En evaluación', color: '#854D0E', bg: 'rgba(234,179,8,0.14)' };
  if (i > h) return { label: '⛔ Inhabitable', color: '#B91C1C', bg: 'rgba(220,38,38,0.12)' };
  if (h > i) return { label: '✅ Habitable', color: '#15803D', bg: 'rgba(22,163,74,0.12)' };
  return { label: '🤔 Sin consenso', color: '#475569', bg: 'rgba(100,116,139,0.14)' };
}

function Card({ s }: { s: Sub }) {
  const [broken, setBroken] = useState(false);
  const v = verdict(s);
  const loc = [s.zona, s.municipio].filter(Boolean).join(', ') || 'Ubicación no indicada';
  const photo = s.photo_ids?.[0];
  return (
    <div className="rounded-2xl overflow-hidden h-full" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="relative w-full overflow-hidden" style={{ paddingTop: '70%', background: '#0B1220' }}>
        {photo && !broken ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" aria-hidden referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'blur(16px) brightness(0.6)', transform: 'scale(1.2)' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="Daño estructural" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-contain" onError={() => setBroken(true)} />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl">🏗️</div>
        )}
        <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: v.bg, color: v.color, backdropFilter: 'blur(4px)' }}>{v.label}</span>
        {s.photo_ids?.length > 1 && <span className="absolute top-2 right-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white" style={{ background: 'rgba(0,0,0,0.55)' }}>📷 {s.photo_ids.length}</span>}
      </div>
      <div className="p-3">
        <div className="text-xs font-semibold leading-tight line-clamp-1" style={{ color: 'var(--text-1)' }}>{loc}</div>
        <div className="flex items-center gap-2 mt-1">
          {s.building_type && <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{s.building_type}</span>}
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>· {s.validations || 0} validaciones</span>
        </div>
      </div>
    </div>
  );
}

export default function DamageCarousel() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [start, setStart] = useState(0);

  useEffect(() => {
    fetch('/api/damage/recent').then(r => r.json()).then((d: Sub[]) => { if (Array.isArray(d)) setSubs(d); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (subs.length <= 1) return;
    const t = setInterval(() => setStart(s => (s + 1) % subs.length), 3500);
    return () => clearInterval(t);
  }, [subs.length]);

  if (subs.length === 0) return null;
  // muestra hasta 3, rotando el orden para dar sensación de "corriendo"
  const n = Math.min(3, subs.length);
  const visible = Array.from({ length: n }, (_, k) => subs[(start + k) % subs.length]);

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="font-display text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--text-1)' }}>
          <span>🔎</span> Últimos análisis
        </h2>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--primary)' }}>en vivo</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map(s => (
            <motion.div key={s.id} layout
              initial={{ opacity: 0, scale: 0.94, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
              <Card s={s} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
