'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface P { id: string; display_name: string; municipio: string | null; parroquia: string | null; hospital_name: string | null; photo_path: string | null }

function Card({ p }: { p: P }) {
  const [broken, setBroken] = useState(false);
  const loc = [p.parroquia, p.municipio].filter(Boolean).join(', ');
  return (
    <Link href="/buscar?estado=found_alive" className="block rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="relative w-full overflow-hidden" style={{ paddingTop: '116%', background: '#0B1220' }}>
        {p.photo_path && !broken ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.photo_path} alt="" aria-hidden loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'blur(16px) brightness(0.7)', transform: 'scale(1.18)' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.photo_path} alt={p.display_name} loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-contain" onError={() => setBroken(true)} />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-display font-extrabold text-3xl" style={{ color: '#475569' }}>{(p.display_name || '?').trim().charAt(0).toUpperCase()}</div>
        )}
        <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: '#16A34A' }}>✅ Encontrado</span>
      </div>
      <div className="p-2.5">
        <div className="text-xs font-semibold leading-tight line-clamp-1" style={{ color: 'var(--text-1)' }}>{p.display_name}</div>
        {p.hospital_name ? (
          <div className="text-[10px] mt-0.5 line-clamp-1 font-medium" style={{ color: '#15803D' }}>🏥 {p.hospital_name}</div>
        ) : loc ? (
          <div className="text-[10px] mt-0.5 line-clamp-1" style={{ color: 'var(--text-3)' }}>📍 {loc}</div>
        ) : null}
      </div>
    </Link>
  );
}

export default function FoundCarousel() {
  const [found, setFound] = useState<P[]>([]);
  const [start, setStart] = useState(0);

  useEffect(() => {
    fetch('/api/persons/list?estado=found_alive&limit=60').then(r => r.json()).then((d: P[]) => {
      if (!Array.isArray(d)) return;
      const withPhoto = d.filter(x => x.photo_path);
      setFound(withPhoto.length >= 4 ? withPhoto : d);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (found.length <= 4) return;
    const t = setInterval(() => setStart(s => (s + 1) % found.length), 3200);
    return () => clearInterval(t);
  }, [found.length]);

  if (found.length === 0) return null;
  const n = Math.min(4, found.length);
  const visible = Array.from({ length: n }, (_, k) => found[(start + k) % found.length]);

  return (
    <section className="px-4 max-w-6xl mx-auto mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
          <span>✅</span> Personas encontradas
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(22,163,74,0.12)', color: '#16A34A' }}>reencuentros</span>
        </h2>
        <Link href="/buscar?estado=found_alive" className="text-xs font-bold whitespace-nowrap" style={{ color: 'var(--primary)' }}>Ver todas →</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map(p => (
            <motion.div key={p.id} layout
              initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
              <Card p={p} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
