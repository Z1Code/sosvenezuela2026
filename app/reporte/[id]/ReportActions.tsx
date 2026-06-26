'use client';
import { useState } from 'react';

export default function ReportActions({ id }: { id: string }) {
  const [mode, setMode] = useState<null | 'confirmo' | 'disputo'>(null);
  const [reason, setReason] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [err, setErr] = useState('');
  const loginUrl = `/login?redirect=${encodeURIComponent('/reporte/' + id)}`;

  async function submit() {
    if (mode === 'disputo' && !reason.trim()) { setErr('Explica brevemente por qué dudas del reporte.'); return; }
    setState('sending'); setErr('');
    try {
      const r = await fetch('/api/reactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ report_id: id, kind: mode }) });
      if (r.status === 401) { window.location.href = loginUrl; return; }
      if (!r.ok) throw new Error();
      if (reason.trim()) {
        const c = await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ report_id: id, body: reason.trim() }) });
        if (c.status === 422) { setErr((await c.json()).error); setState('idle'); return; }
      }
      setState('done');
    } catch { setErr('No se pudo registrar tu aporte.'); setState('idle'); }
  }

  if (state === 'done') return (
    <div className="text-sm rounded-xl px-4 py-3 font-medium" style={{ background: '#F0FDF4', color: '#15803D' }}>
      ✅ ¡Gracias! Tu aporte ayuda a verificar este reporte.
    </div>
  );

  return (
    <div>
      <div className="text-sm font-semibold mb-2" style={{ color: 'var(--text-2)' }}>¿Puedes verificar este suceso?</div>
      <div className="flex gap-2 mb-2">
        <button onClick={() => { setMode('confirmo'); setErr(''); }} className="flex-1 py-2.5 rounded-xl text-sm font-bold"
          style={mode === 'confirmo' ? { background: '#16A34A', color: '#fff' } : { background: '#F0FDF4', color: '#15803D', border: '1px solid #86EFAC' }}>✅ Confirmar</button>
        <button onClick={() => { setMode('disputo'); setErr(''); }} className="flex-1 py-2.5 rounded-xl text-sm font-bold"
          style={mode === 'disputo' ? { background: '#DC2626', color: '#fff' } : { background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>❌ Negar</button>
      </div>
      {mode && (
        <>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} maxLength={200}
            placeholder={mode === 'confirmo' ? 'Añade contexto (opcional)…' : 'Explica por qué dudas (requerido)'}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none mb-2" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)' }} />
          {err && <div className="text-xs mb-2" style={{ color: '#DC2626' }}>{err}</div>}
          <button onClick={submit} disabled={state === 'sending'} className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: state === 'sending' ? '#94A3B8' : 'var(--primary)' }}>{state === 'sending' ? 'Enviando…' : 'Enviar aporte'}</button>
          <p className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--text-3)' }}>Requiere iniciar sesión.</p>
        </>
      )}
    </div>
  );
}
