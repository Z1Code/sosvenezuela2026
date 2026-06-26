'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';

const CATEGORIAS = [
  { value: 'collapsed_building', label: '🏚️ Edificio colapsado', danger: true },
  { value: 'damaged_building',   label: '🏠 Edificio dañado', danger: true },
  { value: 'trapped_people',     label: '🆘 Personas atrapadas', danger: true },
  { value: 'fire',               label: '🔥 Incendio', danger: true },
  { value: 'gas_leak',           label: '💨 Fuga de gas', danger: true },
  { value: 'blocked_road',       label: '🚧 Vía bloqueada', danger: true },
  { value: 'flooding',           label: '🌊 Inundación', danger: true },
  { value: 'medical_need',       label: '🏥 Necesidad médica', danger: true },
  { value: 'shelter',            label: '🏕️ Refugio', danger: false },
  { value: 'water_point',        label: '💧 Agua potable', danger: false },
  { value: 'aid_point',          label: '📦 Punto de ayuda', danger: false },
];

const SEV = [
  { value: 'verde',    label: 'Aparentemente seguro', color: '#16A34A' },
  { value: 'amarillo', label: 'Dañado / precaución',  color: '#EAB308' },
  { value: 'naranja',  label: 'Daño severo',          color: '#EA580C' },
  { value: 'rojo',     label: 'Colapso / inhabitable', color: '#DC2626' },
];

export default function ReportarPage() {
  const [step, setStep] = useState(1);
  const [cat, setCat] = useState('');
  const [sev, setSev] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [parroquia, setParroquia] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [coords, setCoords] = useState<{lat:number;lng:number}|null>(null);
  const [geoErr, setGeoErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const isDanger = CATEGORIAS.find(c => c.value === cat)?.danger ?? true;

  function getGeo() {
    setGeoLoading(true); setGeoErr('');
    navigator.geolocation.getCurrentPosition(
      p => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeoLoading(false); },
      () => { setGeoErr('No se pudo obtener tu ubicación. Actívala o usa las coordenadas manuales.'); setGeoLoading(false); }
    );
  }

  async function submit() {
    if (!cat || !coords) { setError('Selecciona categoría y ubícate en el mapa.'); return; }
    if (isDanger && !sev) { setError('Selecciona la severidad del daño.'); return; }
    setSubmitting(true);
    const res = await fetch('/api/reports', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ category: cat, severity: isDanger ? sev : null, title, description: desc,
        lat: coords.lat, lng: coords.lng, municipio, parroquia })
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setDone(true);
    setTimeout(() => router.push('/'), 2000);
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center p-8">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Reporte enviado</h2>
        <p className="text-sm mt-2" style={{ color: 'var(--text-2)' }}>Gracias. Aparecerá en el mapa en segundos.</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-1)' }}>📍 Nuevo reporte</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
            Informa lo que ves. Tu ubicación exacta NO se comparte públicamente.
          </p>

          {/* Category */}
          <div className="mb-6">
            <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-1)' }}>¿Qué estás reportando?</div>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIAS.map(c => (
                <motion.button key={c.value} whileTap={{ scale: 0.96 }}
                  onClick={() => setCat(c.value)}
                  className="text-left px-4 py-3 rounded-2xl text-sm font-medium transition-all"
                  style={{
                    background: cat === c.value ? (c.danger ? '#FEF2F2' : '#F0FDF4') : 'var(--surface)',
                    border: `1.5px solid ${cat === c.value ? (c.danger ? '#DC2626' : '#16A34A') : 'var(--border)'}`,
                    color: 'var(--text-1)'
                  }}>
                  {c.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Severity (danger only) */}
          {cat && isDanger && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6">
              <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-1)' }}>Nivel de daño</div>
              <div className="grid grid-cols-2 gap-2">
                {SEV.map(s => (
                  <motion.button key={s.value} whileTap={{ scale: 0.96 }}
                    onClick={() => setSev(s.value)}
                    className="py-3 rounded-2xl text-sm font-semibold text-white transition-all"
                    style={{ background: sev === s.value ? s.color : s.color + '80', opacity: sev && sev !== s.value ? 0.5 : 1 }}>
                    {s.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Details */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Título breve (opcional)</label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ border: '1.5px solid var(--border)', background: 'var(--surface)' }}
              placeholder="Ej: Hotel colapsado en la avenida..." />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Descripción (opcional)</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} maxLength={500} rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
              style={{ border: '1.5px solid var(--border)', background: 'var(--surface)' }}
              placeholder="Detalles adicionales..." />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Municipio</label>
              <input value={municipio} onChange={e => setMunicipio(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ border: '1.5px solid var(--border)', background: 'var(--surface)' }}
                placeholder="Ej: Valencia" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Parroquia</label>
              <input value={parroquia} onChange={e => setParroquia(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ border: '1.5px solid var(--border)', background: 'var(--surface)' }}
                placeholder="Ej: El Socorro" />
            </div>
          </div>

          {/* Location */}
          <div className="mb-6 p-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
            <div className="text-sm font-semibold mb-2" style={{ color: 'var(--text-1)' }}>📌 Ubicación</div>
            {coords ? (
              <div className="text-xs" style={{ color: 'var(--safe)' }}>
                ✅ Ubicación capturada — se publicará aproximada (80–250 m de diferencia).
              </div>
            ) : (
              <motion.button whileTap={{ scale: 0.97 }} onClick={getGeo} disabled={geoLoading}
                className="w-full py-2.5 rounded-xl text-sm font-medium"
                style={{ background: geoLoading ? 'var(--text-3)' : 'var(--accent)', color: '#fff' }}>
                {geoLoading ? 'Obteniendo ubicación...' : '📍 Usar mi ubicación actual'}
              </motion.button>
            )}
            {geoErr && <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>{geoErr}</p>}
          </div>

          {error && <p className="text-sm rounded-xl px-3 py-2 mb-4" style={{ background: '#FEF2F2', color: '#DC2626' }}>{error}</p>}

          <motion.button whileTap={{ scale: 0.97 }} onClick={submit} disabled={submitting}
            className="w-full py-4 rounded-2xl font-bold text-white text-base"
            style={{ background: submitting ? 'var(--text-3)' : 'var(--primary)' }}>
            {submitting ? 'Enviando...' : 'Enviar reporte'}
          </motion.button>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
