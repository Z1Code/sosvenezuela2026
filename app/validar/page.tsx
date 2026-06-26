'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import DamageCarousel from '@/components/DamageCarousel';
import Link from 'next/link';

type Role = null | 'residente' | 'ingeniero';
const loginUrl = `/login?redirect=${encodeURIComponent('/validar')}`;
const BTYPES = ['Casa', 'Apartamento / Edificio', 'Hospital', 'Escuela', 'Comercio', 'Otro'];
const SEVS: { v: string; l: string; c: string }[] = [
  { v: 'leve', l: 'Leve', c: '#16A34A' }, { v: 'moderado', l: 'Moderado', c: '#EAB308' },
  { v: 'severo', l: 'Severo', c: '#EA580C' }, { v: 'colapso', l: 'Colapso', c: '#DC2626' },
];

// Comprime la imagen en el navegador antes de subirla (reduce payload y almacenamiento).
function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) { const r = Math.min(maxDim / width, maxDim / height); width = Math.round(width * r); height = Math.round(height * r); }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(reader.result as string); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function ValidarPage() {
  const [role, setRole] = useState<Role>(null);
  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <div className="max-w-xl mx-auto px-4 pt-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-1)' }}>🏗️ Validar daño estructural</h1>
          {role && <button onClick={() => setRole(null)} className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>← cambiar rol</button>}
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
          Vecinos suben fotos de estructuras dañadas; ingenieros y arquitectos validan si son habitables o no.
        </p>
        {role === null && <><DamageCarousel /><RoleGate onPick={setRole} /></>}
        {role === 'residente' && <ResidentUpload />}
        {role === 'ingeniero' && <EngineerQueue />}
      </div>
      <BottomNav />
    </div>
  );
}

function RoleGate({ onPick }: { onPick: (r: Role) => void }) {
  const opts = [
    { r: 'residente' as Role, icon: '🏠', t: 'Soy residente / afectado', d: 'Sube fotos de un edificio o casa con daños para que profesionales lo evalúen.' },
    { r: 'ingeniero' as Role, icon: '👷', t: 'Soy ingeniero / arquitecto', d: 'Revisa fotos y valida la magnitud del daño y si la estructura es habitable.' },
  ];
  return (
    <div className="grid gap-4">
      {opts.map(o => (
        <motion.button key={o.r} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} onClick={() => onPick(o.r)}
          className="text-left rounded-3xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="text-4xl mb-3">{o.icon}</div>
          <div className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text-1)' }}>{o.t}</div>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>{o.d}</p>
        </motion.button>
      ))}
    </div>
  );
}

function ResidentUpload() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [zona, setZona] = useState(''); const [municipio, setMunicipio] = useState('');
  const [btype, setBtype] = useState(''); const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const slots = 6 - photos.length;
    for (const f of Array.from(files).slice(0, slots)) {
      if (!f.type.startsWith('image/')) continue;
      try { const data = await compressImage(f); setPhotos(p => p.length < 6 ? [...p, data] : p); }
      catch { /* imagen ilegible, se omite */ }
    }
  }
  async function submit() {
    if (!photos.length) { setErr('Sube al menos una foto.'); return; }
    setState('sending'); setErr('');
    try {
      const res = await fetch('/api/damage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zona, municipio, building_type: btype, note, photos }) });
      if (res.status === 401) { window.location.href = loginUrl; return; }
      if (res.status === 422) { setErr((await res.json()).error); setState('idle'); return; }
      if (!res.ok) { setErr('No se pudo enviar.'); setState('idle'); return; }
      setState('done');
    } catch { setErr('Error de conexión.'); setState('idle'); }
  }

  if (state === 'done') return (
    <div className="rounded-3xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="text-5xl mb-3">✅</div>
      <div className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text-1)' }}>¡Reporte enviado!</div>
      <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>Ingenieros y arquitectos lo validarán pronto. Gracias por contribuir.</p>
      <button onClick={() => { setPhotos([]); setZona(''); setMunicipio(''); setBtype(''); setNote(''); setState('idle'); }}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>Subir otro</button>
    </div>
  );

  return (
    <div className="rounded-3xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {photos.map((p, i) => (
          <div key={i} className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '1', background: '#0B1220' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <button onClick={() => setPhotos(ph => ph.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-6 h-6 rounded-full text-white text-xs font-bold" style={{ background: 'rgba(0,0,0,0.6)' }}>×</button>
          </div>
        ))}
        {photos.length < 6 && (
          <button onClick={() => fileRef.current?.click()} className="rounded-xl flex flex-col items-center justify-center" style={{ aspectRatio: '1', border: '2px dashed var(--border)', color: 'var(--text-3)' }}>
            <span className="text-2xl">＋</span><span className="text-[10px]">foto</span>
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={e => onFiles(e.target.files)} />

      <input value={zona} onChange={e => setZona(e.target.value)} placeholder="Zona / dirección (ej. Los Corales, La Guaira)"
        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none mb-2" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)' }} />
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input value={municipio} onChange={e => setMunicipio(e.target.value)} placeholder="Municipio / ciudad"
          className="rounded-xl px-3 py-2.5 text-sm outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)' }} />
        <select value={btype} onChange={e => setBtype(e.target.value)} className="rounded-xl px-3 py-2.5 text-sm outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: btype ? 'var(--text-1)' : 'var(--text-3)' }}>
          <option value="">Tipo…</option>
          {BTYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={400} placeholder="Qué se ve (grietas, columnas, inclinación…)"
        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none mb-2" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)' }} />
      {err && <div className="text-xs mb-2" style={{ color: '#DC2626' }}>{err}</div>}
      <button onClick={submit} disabled={state === 'sending'} className="w-full py-3 rounded-2xl text-sm font-bold text-white" style={{ background: state === 'sending' ? '#94A3B8' : 'var(--primary)', boxShadow: 'var(--shadow-teal)' }}>
        {state === 'sending' ? 'Enviando…' : 'Enviar para validación'}
      </button>
      <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-3)' }}>Requiere iniciar sesión. No subas fotos con datos personales visibles.</p>
    </div>
  );
}

interface Sub { id: string; zona: string | null; municipio: string | null; building_type: string | null; note: string | null; photo_ids: string[]; validations: number }

function EngineerQueue() {
  const [queue, setQueue] = useState<Sub[] | null>(null);
  const [i, setI] = useState(0);
  const [sev, setSev] = useState('');
  const [note, setNote] = useState('');
  const [photoIdx, setPhotoIdx] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const yesOp = useTransform(x, [40, 140], [0, 1]);
  const noOp = useTransform(x, [-140, -40], [1, 0]);

  useEffect(() => { fetch('/api/damage').then(r => r.json()).then(d => setQueue(Array.isArray(d) ? d : [])).catch(() => setQueue([])); }, []);

  const cur = queue && queue[i];
  async function commit(hab: 'habitable' | 'inhabitable' | 'incierto') {
    if (!cur) return;
    fetch('/api/damage/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submission_id: cur.id, habitabilidad: hab, severidad: sev, note: note.trim() }) })
      .then(r => { if (r.status === 401) window.location.href = loginUrl; }).catch(() => {});
    setI(v => v + 1); setSev(''); setNote(''); setPhotoIdx(0); x.set(0);
  }

  if (queue === null) return <div className="text-center py-16 text-sm" style={{ color: 'var(--text-3)' }}>Cargando casos…</div>;
  if (!cur) return (
    <div className="rounded-3xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="text-5xl mb-3">🎉</div>
      <div className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text-1)' }}>¡Sin casos pendientes!</div>
      <p className="text-sm" style={{ color: 'var(--text-2)' }}>Has validado todo por ahora. Vuelve más tarde — entran nuevos constantemente.</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3 text-xs" style={{ color: 'var(--text-3)' }}>
        <span>Desliza ➡️ habitable · ⬅️ inhabitable</span>
        <span className="font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)' }}>Caso {i + 1} de {queue.length}</span>
      </div>
      <div className="relative" style={{ height: 460 }}>
        <AnimatePresence>
          <motion.div key={cur.id} drag="x" dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => { if (info.offset.x > 130) commit('habitable'); else if (info.offset.x < -130) commit('inhabitable'); }}
            initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-3xl overflow-hidden flex flex-col"
            style={{ x, rotate, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', cursor: 'grab' }}>
            <div className="relative flex-1" style={{ background: '#0B1220', minHeight: 0 }} onClick={() => setPhotoIdx(p => (p + 1) % Math.max(1, cur.photo_ids.length))}>
              {cur.photo_ids[photoIdx] && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cur.photo_ids[photoIdx]} alt="" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'blur(18px) brightness(0.6)', transform: 'scale(1.2)' }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cur.photo_ids[photoIdx]} alt="daño" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-contain" />
                </>
              )}
              {cur.photo_ids.length > 1 && (
                <div className="absolute top-2 left-0 right-0 flex justify-center gap-1">
                  {cur.photo_ids.map((_, k) => <span key={k} className="w-6 h-1 rounded-full" style={{ background: k === photoIdx ? '#fff' : 'rgba(255,255,255,0.4)' }} />)}
                </div>
              )}
              <motion.div style={{ opacity: yesOp }} className="absolute top-4 left-4 px-3 py-1 rounded-lg text-sm font-extrabold border-2" >
                <span style={{ color: '#16A34A', borderColor: '#16A34A' }} className="px-2 py-1 rounded-lg border-2">HABITABLE</span>
              </motion.div>
              <motion.div style={{ opacity: noOp }} className="absolute top-4 right-4">
                <span style={{ color: '#DC2626', borderColor: '#DC2626' }} className="px-2 py-1 rounded-lg border-2 text-sm font-extrabold">INHABITABLE</span>
              </motion.div>
            </div>
            <div className="p-4">
              <div className="font-display font-bold text-base" style={{ color: 'var(--text-1)' }}>{[cur.zona, cur.municipio].filter(Boolean).join(', ') || 'Ubicación no indicada'}</div>
              {cur.building_type && <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{cur.building_type}</div>}
              {cur.note && <p className="text-sm mt-1.5" style={{ color: 'var(--text-2)' }}>{cur.note}</p>}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* severidad */}
      <div className="flex gap-2 justify-center mt-4 flex-wrap">
        {SEVS.map(s => (
          <button key={s.v} onClick={() => setSev(v => v === s.v ? '' : s.v)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{ background: sev === s.v ? s.c : 'var(--surface)', color: sev === s.v ? '#fff' : s.c, border: `1px solid ${s.c}55` }}>{s.l}</button>
        ))}
      </div>

      {/* nota técnica opcional */}
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={300}
        placeholder="Observación técnica (opcional): tipo de grieta, elemento afectado, recomendación…"
        className="w-full mt-3 rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
        style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)' }} />

      {/* acciones */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => commit('inhabitable')} className="w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-lg" style={{ background: '#fff', border: '2px solid #DC2626' }}>❌</motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => commit('incierto')} className="w-12 h-12 rounded-full flex items-center justify-center text-lg shadow" style={{ background: '#fff', border: '2px solid #94A3B8' }}>🤔</motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => commit('habitable')} className="w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-lg" style={{ background: '#fff', border: '2px solid #16A34A' }}>✅</motion.button>
      </div>
      <div className="flex justify-center gap-6 mt-2 text-[10px] font-semibold" style={{ color: 'var(--text-3)' }}>
        <span>Inhabitable</span><span>No seguro</span><span>Habitable</span>
      </div>
      <p className="text-[10px] mt-3 text-center" style={{ color: 'var(--text-3)' }}>Tu validación requiere iniciar sesión. Toca la foto para ver más imágenes.</p>
    </div>
  );
}
