'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';

interface Person {
  id: string;
  status: string;
  cedula_masked: string | null;
  display_name: string;
  municipio: string | null;
  parroquia: string | null;
  hospital_name: string | null;
  photo_path: string | null;
  source_date: string;
}

const STATUS_LABEL: Record<string, string> = {
  seeking_info: 'Desaparecido', self_safe: 'A salvo', found_alive: 'Encontrado',
  injured: 'Herido', hospitalized: 'Hospitalizado', sheltered: 'En refugio', unknown: 'Desconocido',
};
const STATUS_COLOR: Record<string, string> = {
  seeking_info: '#DC2626', self_safe: '#16A34A', found_alive: '#16A34A', injured: '#EA580C',
  hospitalized: '#EAB308', sheltered: '#0D9488', unknown: '#94A3B8',
};
const PAGE = 100;

function PersonCard({ p, onClick }: { p: Person; onClick: () => void }) {
  const [broken, setBroken] = useState(false);
  const color = STATUS_COLOR[p.status] || '#64748B';
  return (
    <motion.button onClick={onClick} initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ y: -3 }}
      className="rounded-2xl overflow-hidden text-left w-full cursor-pointer"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      {/* Portrait 4:5 box. Blurred-cover backdrop + full image (contain) → la persona
          se ve COMPLETA sin recortes, con relleno elegante en vez de barras. */}
      <div className="relative w-full overflow-hidden" style={{ paddingTop: '142%', background: '#0B1220' }}>
        {p.photo_path && !broken ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.photo_path} alt="" aria-hidden loading="lazy" referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'blur(16px) brightness(0.75)', transform: 'scale(1.18)' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.photo_path} alt={p.display_name} loading="lazy" referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-contain" onError={() => setBroken(true)} />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-display font-extrabold text-3xl" style={{ color: '#475569' }}>
            {(p.display_name || '?').trim().charAt(0).toUpperCase()}
          </div>
        )}
        <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: color }}>
          {STATUS_LABEL[p.status] || p.status}
        </span>
      </div>
      {/* Fixed-height text area so every card is identical */}
      <div className="p-2.5" style={{ height: 68 }}>
        <div className="text-xs font-semibold leading-tight line-clamp-2" style={{ color: 'var(--text-1)' }}>{p.display_name}</div>
        {p.hospital_name ? (
          <div className="text-[10px] mt-1 line-clamp-1 font-medium" style={{ color: '#15803D' }}>🏥 {p.hospital_name}</div>
        ) : (p.parroquia || p.municipio) ? (
          <div className="text-[10px] mt-1 line-clamp-1" style={{ color: 'var(--text-2)' }}>
            📍 {[p.parroquia, p.municipio].filter(Boolean).join(', ')}
          </div>
        ) : p.cedula_masked ? (
          <div className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>{p.cedula_masked}</div>
        ) : null}
      </div>
    </motion.button>
  );
}

interface PersonDetail { sex: string | null; note_text: string | null; tips: number; source_date: string; hospital_name: string | null }

function DetailModal({ p, onClose }: { p: Person; onClose: () => void }) {
  const [body, setBody] = useState('');
  const [contact, setContact] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [err, setErr] = useState('');
  const [broken, setBroken] = useState(false);
  const [detail, setDetail] = useState<PersonDetail | null>(null);
  const color = STATUS_COLOR[p.status] || '#64748B';

  useEffect(() => {
    fetch(`/api/persons/${p.id}`).then(r => r.ok ? r.json() : null).then(setDetail).catch(() => {});
  }, [p.id]);

  const SEX_LABEL: Record<string, string> = { masculino: 'Masculino', femenino: 'Femenino', m: 'Masculino', f: 'Femenino' };

  async function submit() {
    if (!body.trim()) { setErr('Escribe la información que tienes.'); return; }
    setState('sending'); setErr('');
    try {
      const res = await fetch('/api/persons/tip', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person_id: p.id, body: body.trim(), contact: contact.trim() }),
      });
      if (res.status === 401) { window.location.href = `/login?redirect=${encodeURIComponent('/buscar')}`; return; }
      if (res.status === 422) { setErr((await res.json()).error); setState('error'); return; }
      if (!res.ok) { setErr('No se pudo enviar.'); setState('error'); return; }
      setState('done');
    } catch { setErr('Error de conexión.'); setState('error'); }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto" style={{ background: '#fff' }}>
        <div className="relative">
          <div className="w-full" style={{ aspectRatio: '3/4', maxHeight: '52vh', background: '#0B1220', position: 'relative', overflow: 'hidden' }}>
            {p.photo_path && !broken ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.photo_path} alt="" aria-hidden referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'blur(20px) brightness(0.7)', transform: 'scale(1.2)' }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.photo_path} alt={p.display_name} referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-contain" onError={() => setBroken(true)} />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center font-display font-extrabold text-6xl" style={{ color: '#475569' }}>
                {(p.display_name || '?').trim().charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <button onClick={onClose} aria-label="Cerrar"
            className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold"
            style={{ background: 'rgba(255,255,255,0.9)', color: '#0F172A' }}>×</button>
          <span className="absolute bottom-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: color }}>
            {STATUS_LABEL[p.status] || p.status}
          </span>
        </div>

        <div className="p-5">
          <h2 className="font-display text-xl font-bold" style={{ color: 'var(--text-1)' }}>{p.display_name}</h2>
          {p.cedula_masked && <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{p.cedula_masked}</div>}
          {['found_alive', 'self_safe', 'sheltered', 'hospitalized'].includes(p.status) && (() => {
            const donde = p.hospital_name || detail?.hospital_name || [p.parroquia, p.municipio].filter(Boolean).join(', ');
            return (
              <div className="mt-2 rounded-xl px-3 py-2 text-sm font-bold flex items-center gap-2" style={{ background: 'rgba(22,163,74,0.1)', color: '#15803D' }}>
                <span>✅</span><span>{STATUS_LABEL[p.status] || 'Encontrada'}{donde ? ` — encontrada en ${donde}` : ''}</span>
              </div>
            );
          })()}
          {(p.parroquia || p.municipio) && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.parroquia, p.municipio, 'Venezuela'].filter(Boolean).join(', '))}`}
              target="_blank" rel="noopener noreferrer"
              className="text-sm mt-2 inline-block font-medium" style={{ color: 'var(--primary)' }}>
              📍 {[p.parroquia, p.municipio].filter(Boolean).join(', ')} · ver en Maps ↗
            </a>
          )}
          {detail?.hospital_name && (
            <div className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>🏥 {detail.hospital_name}</div>
          )}

          {detail?.note_text && (
            <p className="text-sm leading-relaxed mt-3 rounded-xl px-3 py-2.5" style={{ color: 'var(--text-2)', background: 'var(--surface-2)' }}>
              {detail.note_text}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
            {detail?.sex && (
              <span className="px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
                {SEX_LABEL[(detail.sex || '').toLowerCase()] || detail.sex}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
              Reportado: {new Date(p.source_date).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}
            </span>
            {!!detail?.tips && detail.tips > 0 && (
              <span className="px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--primary)' }}>
                {detail.tips} aporte{detail.tips !== 1 ? 's' : ''} de la comunidad
              </span>
            )}
          </div>

          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            {state === 'done' ? (
              <div className="text-sm rounded-xl px-4 py-3 font-medium text-center" style={{ background: '#F0FDF4', color: '#15803D' }}>
                ✅ ¡Gracias! Tu información fue registrada y ayudará a localizar a esta persona.
              </div>
            ) : (
              <>
                <div className="font-display font-bold text-sm mb-2" style={{ color: 'var(--text-1)' }}>¿Tienes información sobre esta persona?</div>
                <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} maxLength={400}
                  placeholder="Dónde y cuándo la viste, su estado actual, refugio u hospital donde se encuentra…"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)' }} />
                <input value={contact} onChange={e => setContact(e.target.value)} maxLength={80}
                  placeholder="Cómo contactarte (opcional, privado)"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none mt-2"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)' }} />
                {err && <div className="text-xs mt-2" style={{ color: '#DC2626' }}>{err}</div>}
                <button onClick={submit} disabled={state === 'sending'}
                  className="w-full mt-3 py-3 rounded-2xl text-sm font-bold text-white"
                  style={{ background: state === 'sending' ? '#94A3B8' : 'var(--primary)', boxShadow: 'var(--shadow-teal)' }}>
                  {state === 'sending' ? 'Enviando…' : 'Aportar información'}
                </button>
                <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-3)' }}>Requiere iniciar sesión. Tu contacto se guarda en privado.</p>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function BuscarPage() {
  const [query, setQuery] = useState('');
  const [activeQ, setActiveQ] = useState('');
  const [estado, setEstado] = useState<'' | 'seeking_info' | 'found_alive'>('');
  const [people, setPeople] = useState<Person[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(true);
  const [stats, setStats] = useState<{ missing: number; found: number; total: number } | null>(null);
  const [selected, setSelected] = useState<Person | null>(null);

  useEffect(() => { fetch('/api/persons/stats').then(r => r.json()).then(setStats).catch(() => {}); }, []);

  // Lee filtros desde la URL (?estado=found_alive, ?q=) al entrar
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const e = sp.get('estado');
    if (e === 'found_alive' || e === 'seeking_info') setEstado(e);
    const q0 = sp.get('q');
    if (q0) { setQuery(q0); setActiveQ(q0); }
  }, []);

  const reqId = useRef(0);
  const load = useCallback(async (off: number, q: string, est: string, append: boolean) => {
    const my = ++reqId.current;
    setLoading(true);
    const params = new URLSearchParams({ offset: String(off), limit: String(PAGE) });
    if (q.length >= 2) params.set('q', q);
    if (est) params.set('estado', est);
    const res = await fetch(`/api/persons/list?${params}`);
    const data: Person[] = res.ok ? await res.json() : [];
    if (my !== reqId.current) return; // respuesta obsoleta: el filtro cambió mientras cargaba
    setPeople(prev => append ? [...prev, ...data] : data);
    setMore(data.length === PAGE);
    setLoading(false);
  }, []);

  useEffect(() => { setOffset(0); load(0, activeQ, estado, false); }, [activeQ, estado, load]);

  function loadMore() { const o = offset + PAGE; setOffset(o); load(o, activeQ, estado, true); }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto px-4 pt-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-1)' }}>🔎 Personas</h1>
            {stats && (
              <div className="flex gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}>{stats.missing.toLocaleString('es')} desaparecidos</span>
                <span className="px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(22,163,74,0.1)', color: '#16A34A' }}>{stats.found.toLocaleString('es')} encontrados</span>
              </div>
            )}
          </div>
          <p className="text-sm mb-5" style={{ color: 'var(--text-2)' }}>
            Directorio de personas reportadas tras el terremoto. Busca por nombre, explora la lista y haz clic en alguien para aportar información.
          </p>

          <div className="flex gap-2 mb-3">
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setActiveQ(query.trim()); }}
              placeholder="Buscar por nombre…"
              className="flex-1 rounded-2xl px-4 py-3 text-sm outline-none"
              style={{ border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1)' }} />
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setActiveQ(query.trim())}
              className="px-5 py-3 rounded-2xl text-sm font-semibold text-white" style={{ background: 'var(--primary)', flexShrink: 0 }}>
              Buscar
            </motion.button>
          </div>

          <div className="flex gap-2 mb-5">
            {([['', 'Todos'], ['seeking_info', 'Desaparecidos'], ['found_alive', 'Encontrados']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setEstado(v)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: estado === v ? 'var(--primary)' : 'var(--surface)', color: estado === v ? '#fff' : 'var(--text-2)', border: '1px solid var(--border)' }}>
                {label}
              </button>
            ))}
          </div>

          {people.length === 0 && !loading ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-medium" style={{ color: 'var(--text-1)' }}>Sin resultados</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 items-start">
              {people.map(p => <PersonCard key={p.id} p={p} onClick={() => setSelected(p)} />)}
            </div>
          )}

          {loading && <div className="text-center py-6 text-sm" style={{ color: 'var(--text-3)' }}>Cargando…</div>}

          {more && !loading && people.length > 0 && (
            <div className="text-center mt-6">
              <motion.button whileTap={{ scale: 0.97 }} onClick={loadMore}
                className="px-6 py-3 rounded-2xl text-sm font-semibold" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', boxShadow: 'var(--shadow-sm)' }}>
                Mostrar más personas
              </motion.button>
            </div>
          )}

          <div className="mt-8 pt-6 flex flex-wrap gap-3 justify-between items-center" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Datos de carteles públicos y registros comunitarios. Los teléfonos de contacto se mantienen privados.</p>
            <Link href="/reportar-persona">
              <motion.div whileTap={{ scale: 0.97 }}
                className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-center text-white" style={{ background: 'var(--accent)' }}>
                📋 Reportar persona
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {selected && <DetailModal p={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
