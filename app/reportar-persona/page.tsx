'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';

const STATUSES = [
  { value: 'found_alive',   label: '✅ La encontré / está viva' },
  { value: 'self_safe',     label: '🙋 Se reportó a salvo' },
  { value: 'injured',       label: '🩹 Herida (puede comunicarse)' },
  { value: 'hospitalized',  label: '🏥 Hospitalizada' },
  { value: 'sheltered',     label: '🏕️ En refugio' },
  { value: 'seeking_info',  label: '🔎 La estoy buscando' },
  { value: 'unknown',       label: '❓ Estado desconocido' },
];

export default function ReportarPersonaPage() {
  const [form, setForm] = useState({
    status: '', given_name: '', family_name: '', full_name: '',
    cedula: '', cedula_type: 'V', is_minor: false,
    age_min: '', age_max: '', sex: '', phone: '',
    municipio: '', parroquia: '', hospital_name: '', note_text: '',
    is_self_report: false,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  function update(k: string, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const fullName = form.full_name || `${form.given_name} ${form.family_name}`.trim();
    if (!fullName || !form.status) { setError('Nombre y estado son obligatorios.'); return; }
    setSubmitting(true); setError('');
    const res = await fetch('/api/persons', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, full_name: fullName,
        age_min: form.age_min ? parseInt(form.age_min) : null,
        age_max: form.age_max ? parseInt(form.age_max) : null })
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setDone(true);
    setTimeout(() => router.push('/buscar'), 2000);
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center p-8">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Reporte enviado</h2>
        <p className="text-sm mt-2" style={{ color: 'var(--text-2)' }}>Si hay avisos activos sobre esta cédula, los usuarios recibirán una notificación.</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-1)' }}>📋 Reportar persona</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
            Los datos sensibles (cédula completa, teléfono) son privados. El público solo ve nombre parcial y estado.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-1)' }}>Estado de la persona *</label>
              <div className="space-y-2">
                {STATUSES.map(s => (
                  <label key={s.value} className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer"
                    style={{ background: form.status === s.value ? 'var(--primary-light)' : 'var(--surface)', border: `1.5px solid ${form.status === s.value ? 'var(--primary)' : 'var(--border)'}` }}>
                    <input type="radio" name="status" value={s.value} checked={form.status === s.value}
                      onChange={e => update('status', e.target.value)} className="sr-only" />
                    <span className="text-sm" style={{ color: 'var(--text-1)' }}>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Nombre *</label>
                <input value={form.given_name} onChange={e => update('given_name', e.target.value)} required
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ border: '1.5px solid var(--border)', background: 'var(--surface)' }}
                  placeholder="José" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Apellido *</label>
                <input value={form.family_name} onChange={e => update('family_name', e.target.value)} required
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ border: '1.5px solid var(--border)', background: 'var(--surface)' }}
                  placeholder="García" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Cédula (privada)</label>
              <div className="flex gap-2">
                <select value={form.cedula_type} onChange={e => update('cedula_type', e.target.value)}
                  className="rounded-xl px-3 py-3 text-sm outline-none w-16"
                  style={{ border: '1.5px solid var(--border)', background: 'var(--surface)' }}>
                  <option>V</option><option>E</option>
                </select>
                <input value={form.cedula} onChange={e => update('cedula', e.target.value)}
                  className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ border: '1.5px solid var(--border)', background: 'var(--surface)' }}
                  placeholder="12345678" />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <input type="checkbox" id="minor" checked={form.is_minor}
                onChange={e => update('is_minor', e.target.checked)}
                className="w-4 h-4 rounded" />
              <label htmlFor="minor" className="text-sm" style={{ color: 'var(--text-1)' }}>
                Es menor de edad (el nombre no se mostrará públicamente)
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Teléfono (privado)</label>
              <input value={form.phone} onChange={e => update('phone', e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ border: '1.5px solid var(--border)', background: 'var(--surface)' }}
                placeholder="0412-1234567" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Municipio</label>
                <input value={form.municipio} onChange={e => update('municipio', e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ border: '1.5px solid var(--border)', background: 'var(--surface)' }}
                  placeholder="Municipio" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Parroquia</label>
                <input value={form.parroquia} onChange={e => update('parroquia', e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ border: '1.5px solid var(--border)', background: 'var(--surface)' }}
                  placeholder="Parroquia" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Hospital / refugio</label>
              <input value={form.hospital_name} onChange={e => update('hospital_name', e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ border: '1.5px solid var(--border)', background: 'var(--surface)' }}
                placeholder="Nombre del centro" />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Nota adicional (privada)</label>
              <textarea value={form.note_text} onChange={e => update('note_text', e.target.value)} rows={3}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                style={{ border: '1.5px solid var(--border)', background: 'var(--surface)' }}
                placeholder="Información adicional para los familiares..." />
            </div>

            {error && <p className="text-sm rounded-xl px-3 py-2" style={{ background: '#FEF2F2', color: '#DC2626' }}>{error}</p>}

            <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={submitting}
              className="w-full py-4 rounded-2xl font-bold text-white"
              style={{ background: submitting ? 'var(--text-3)' : 'var(--primary)' }}>
              {submitting ? 'Enviando...' : 'Enviar reporte de persona'}
            </motion.button>
          </form>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
