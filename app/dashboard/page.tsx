'use client';
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import { useSse, HazardEvent } from '../sse-provider';
import Link from 'next/link';

const SEV_COLORS = { rojo: '#DC2626', naranja: '#EA580C', amarillo: '#EAB308', verde: '#16A34A' };
const SEV_LABELS = { rojo: 'Colapso', naranja: 'Severo', amarillo: 'Dañado', verde: 'Seguro' };
const CAT_LABELS: Record<string,string> = {
  collapsed_building: '🏚️ Colapsado', damaged_building: '🏠 Dañado', trapped_people: '🆘 Atrapados',
  fire: '🔥 Incendio', gas_leak: '💨 Gas', blocked_road: '🚧 Vía bloqueada',
  flooding: '🌊 Inundación', medical_need: '🏥 Médico', shelter: '🏕️ Refugio',
  water_point: '💧 Agua', aid_point: '📦 Ayuda',
};

function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / 20);
    const timer = setInterval(() => {
      start = Math.min(start + step, value);
      setDisplay(start);
      if (start >= value) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}</span>;
}

export default function DashboardPage() {
  const [reports, setReports] = useState<HazardEvent[]>([]);
  const { hazards, presence, checkins } = useSse();

  useEffect(() => {
    fetch('/api/reports').then(r => r.json()).then(setReports);
  }, []);

  const all = useMemo(() => {
    const ids = new Set(reports.map(r => r.id));
    return [...reports, ...hazards.filter(h => !ids.has(h.id))];
  }, [reports, hazards]);

  const bySev = useMemo(() => {
    const c: Record<string,number> = { rojo: 0, naranja: 0, amarillo: 0, verde: 0 };
    all.forEach(r => { if (r.severity && c[r.severity] !== undefined) c[r.severity]++; });
    return c;
  }, [all]);

  const byCat = useMemo(() => {
    const c: Record<string,number> = {};
    all.forEach(r => { c[r.category] = (c[r.category] || 0) + 1; });
    return Object.entries(c).sort((a,b) => b[1]-a[1]);
  }, [all]);

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>📊 Estado general</h1>
            <div className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              🟢 {presence} en línea
            </div>
          </div>

          {/* ALERTA SISMOS */}
          <div className="rounded-2xl p-4 mb-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <div className="font-bold text-sm mb-1" style={{ color: '#991B1B' }}>🔴 Sismos del 24 de junio de 2026</div>
            <div className="text-xs" style={{ color: '#DC2626' }}>
              M7.1 (17:04 VET) + M7.5 (17:05 VET) — Yaracuy/Carabobo. Epicentros marcados en el mapa.<br />
              ⚠️ Se esperan réplicas. Aléjate de estructuras dañadas.
            </div>
          </div>

          {/* TOTAL */}
          <div className="rounded-3xl p-6 mb-4 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="text-5xl font-black mb-1" style={{ color: 'var(--primary)' }}>
              <CountUp value={all.length} />
            </div>
            <div className="text-sm" style={{ color: 'var(--text-2)' }}>reportes en tiempo real</div>
          </div>

          {/* BY SEVERITY */}
          <div className="rounded-3xl p-5 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="font-semibold text-sm mb-4" style={{ color: 'var(--text-1)' }}>Por severidad</div>
            <div className="space-y-3">
              {(Object.entries(bySev) as [string,number][]).map(([k, v]) => (
                <div key={k}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium" style={{ color: 'var(--text-1)' }}>{(SEV_LABELS as Record<string,string>)[k]}</span>
                    <span style={{ color: 'var(--text-2)' }}>{v}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
                    <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: all.length ? v / all.length : 0 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ originX: 0, background: (SEV_COLORS as Record<string,string>)[k], width: '100%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* BY CATEGORY */}
          <div className="rounded-3xl p-5 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="font-semibold text-sm mb-3" style={{ color: 'var(--text-1)' }}>Por tipo</div>
            <div className="space-y-2">
              {byCat.map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-1)' }}>{CAT_LABELS[k] || k}</span>
                  <span className="font-bold" style={{ color: 'var(--primary)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CHECK-INS */}
          {checkins.length > 0 && (
            <div className="rounded-3xl p-5 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="font-semibold text-sm mb-3" style={{ color: 'var(--text-1)' }}>🙋 Últimos check-ins "Estoy a salvo"</div>
              {checkins.slice(-5).reverse().map(c => (
                <div key={c.id} className="text-xs mb-2">
                  <span className="font-medium">{c.full_name || 'Alguien'}</span>
                  {c.estado && <span className="ml-1" style={{ color: 'var(--text-2)' }}>desde {c.estado}</span>}
                  {c.msg && <span className="ml-1 italic" style={{ color: 'var(--text-3)' }}>"{c.msg}"</span>}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <Link href="/reportar" className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white text-center"
              style={{ background: 'var(--primary)' }}>+ Nuevo reporte</Link>
            <Link href="/" className="flex-1 py-3 rounded-2xl text-sm font-semibold text-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)' }}>Ver mapa</Link>
          </div>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
