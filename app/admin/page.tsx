'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface Stats {
  users: { total: number; today: number; google: number };
  reports: { total: number; today: number; rojo: number };
  persons: { total: number; found: number };
  checkins: { total: number; today: number };
  chats: { total: number };
  mod_blocks: { total: number; today: number };
  recent_users: { id: string; email: string; full_name: string; role: string; created_at: string }[];
  recent_reports: { id: string; title: string; category: string; severity: string; verification: string; municipio: string; created_at: string }[];
  traffic: {
    views_total: number; views_today: number; visitors_total: number; visitors_today: number;
    by_day: { d: string; n: number }[];
    top_paths: { path: string; n: number }[];
    devices: { device: string; n: number }[];
    referrers: { referrer: string; n: number }[];
  };
}

function TrafficSection({ t }: { t: Stats['traffic'] }) {
  const maxDay = Math.max(1, ...t.by_day.map(d => d.n));
  const maxPath = Math.max(1, ...t.top_paths.map(p => p.n));
  return (
    <div className="rounded-2xl p-5 mb-8" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
      <div className="font-bold text-sm mb-4" style={{ color: '#0F172A' }}>📈 Tráfico del sitio</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Visitas totales" value={t.views_total.toLocaleString('es')} sub={`+${t.views_today} hoy`} color="#0D9488" />
        <StatCard label="Visitantes únicos" value={t.visitors_total.toLocaleString('es')} sub={`+${t.visitors_today} hoy`} color="#0EA5E9" />
        <StatCard label="Visitas hoy" value={t.views_today.toLocaleString('es')} color="#7C3AED" />
        <StatCard label="Únicos hoy" value={t.visitors_today.toLocaleString('es')} color="#EA580C" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* últimos 7 días */}
        <div>
          <div className="text-xs font-semibold mb-3" style={{ color: '#475569' }}>Visitas últimos 7 días</div>
          <div className="flex items-end gap-2" style={{ height: 120 }}>
            {t.by_day.length === 0 && <div className="text-xs" style={{ color: '#94A3B8' }}>Sin datos aún</div>}
            {t.by_day.map(d => (
              <div key={d.d} className="flex-1 flex flex-col items-center justify-end gap-1" style={{ height: '100%' }}>
                <div className="text-[10px] font-bold" style={{ color: '#0D9488' }}>{d.n}</div>
                <div className="w-full rounded-t-md" style={{ height: `${(d.n / maxDay) * 90}%`, minHeight: 3, background: '#0D9488' }} />
                <div className="text-[9px]" style={{ color: '#94A3B8' }}>{d.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* páginas más vistas */}
        <div>
          <div className="text-xs font-semibold mb-3" style={{ color: '#475569' }}>Páginas más visitadas (7 días)</div>
          <div className="space-y-1.5">
            {t.top_paths.map(p => (
              <div key={p.path} className="flex items-center gap-2">
                <span className="text-[11px] font-mono truncate" style={{ color: '#0F172A', width: 110 }}>{p.path}</span>
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                  <div className="h-full rounded-full" style={{ width: `${(p.n / maxPath) * 100}%`, background: '#0EA5E9' }} />
                </div>
                <span className="text-[11px] font-bold tabular-nums" style={{ color: '#475569', width: 44, textAlign: 'right' }}>{p.n.toLocaleString('es')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div>
          <div className="text-xs font-semibold mb-2" style={{ color: '#475569' }}>Dispositivos</div>
          <div className="flex gap-2 flex-wrap">
            {t.devices.map(d => (
              <span key={d.device} className="text-xs px-3 py-1.5 rounded-full" style={{ background: '#F1F5F9', color: '#475569' }}>
                {d.device === 'mobile' ? '📱 Móvil' : d.device === 'desktop' ? '💻 Escritorio' : d.device === 'tablet' ? '📲 Tablet' : d.device}: <strong>{d.n.toLocaleString('es')}</strong>
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold mb-2" style={{ color: '#475569' }}>De dónde llegan (referencias)</div>
          {t.referrers.length === 0 ? (
            <div className="text-xs" style={{ color: '#94A3B8' }}>Sin referencias externas registradas</div>
          ) : (
            <div className="space-y-1">
              {t.referrers.map(r => (
                <div key={r.referrer} className="flex justify-between text-[11px]">
                  <span className="truncate" style={{ color: '#475569', maxWidth: 220 }}>{r.referrer.replace(/^https?:\/\//, '')}</span>
                  <span className="font-bold" style={{ color: '#0F172A' }}>{r.n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
      <div className="text-xs font-medium mb-1" style={{ color: '#64748B' }}>{label}</div>
      <div className="text-3xl font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>{sub}</div>}
    </div>
  );
}

const SEV_COLOR: Record<string, string> = { rojo: '#DC2626', naranja: '#EA580C', amarillo: '#CA8A04', verde: '#16A34A' };
const SEV_LABEL: Record<string, string> = { rojo: 'Crítico', naranja: 'Grave', amarillo: 'Moderado', verde: 'Leve' };
const CAT_LABEL: Record<string, string> = {
  collapsed_building: 'Edificio colapsado', structural_damage: 'Daño estructural',
  fire: 'Incendio', gas_leak: 'Fuga gas', road_block: 'Vía bloqueada',
  medical_emergency: 'Emergencia médica', people_trapped: 'Atrapados', resources_available: 'Recursos',
};

interface Tw { id: string; tweet_id: string; url: string; posted_at: string }
function TweetManager() {
  const [tweets, setTweets] = useState<Tw[]>([]);
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => fetch('/api/tweets').then(r => r.json()).then(d => Array.isArray(d) && setTweets(d)).catch(() => {});
  useEffect(() => { load(); }, []);

  async function add() {
    setBusy(true); setMsg('');
    const res = await fetch('/api/tweets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg(data.error || 'Error'); return; }
    setUrl(''); setMsg('✅ Tweet agregado'); load();
  }
  async function del(id: string) {
    await fetch(`/api/tweets?id=${id}`, { method: 'DELETE' });
    setTweets(t => t.filter(x => x.id !== id));
  }

  return (
    <div className="rounded-2xl p-5 mb-8" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
      <div className="font-bold text-sm mb-1" style={{ color: '#0F172A' }}>𝕏 Tweets sobre el terremoto</div>
      <div className="text-xs mb-3" style={{ color: '#64748B' }}>Pega el enlace de un tweet; se ordenan solos por hora de publicación y se muestran en el inicio.</div>
      <div className="flex gap-2 mb-2">
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://x.com/usuario/status/123…"
          className="flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={{ border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A' }}
          onKeyDown={e => e.key === 'Enter' && url && add()} />
        <button onClick={add} disabled={busy || !url} className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: busy || !url ? '#94A3B8' : '#0D9488' }}>{busy ? '…' : 'Agregar'}</button>
      </div>
      {msg && <div className="text-xs mb-2" style={{ color: msg.startsWith('✅') ? '#16A34A' : '#DC2626' }}>{msg}</div>}
      <div className="space-y-1.5 max-h-56 overflow-y-auto">
        {tweets.map(t => (
          <div key={t.id} className="flex items-center gap-2 text-xs rounded-lg px-3 py-2" style={{ background: '#F8FAFC' }}>
            <span className="flex-1 truncate" style={{ color: '#475569' }}>{t.url}</span>
            <span className="flex-shrink-0" style={{ color: '#94A3B8' }}>{new Date(t.posted_at).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}</span>
            <button onClick={() => del(t.id)} className="flex-shrink-0 font-bold" style={{ color: '#DC2626' }}>✕</button>
          </div>
        ))}
        {tweets.length === 0 && <div className="text-xs text-center py-3" style={{ color: '#94A3B8' }}>Sin tweets aún</div>}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'users' | 'reports'>('users');

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => { if (!r.ok) throw new Error(r.status === 403 ? 'Acceso denegado' : 'Error'); return r.json(); })
      .then(setStats)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFC' }}>
      <div className="text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#0F172A' }}>{error}</h1>
        <p className="text-sm mb-6" style={{ color: '#64748B' }}>Esta área es exclusiva del administrador.</p>
        <Link href="/" className="px-6 py-3 rounded-xl text-white text-sm font-semibold" style={{ background: '#0D9488' }}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );

  if (!stats) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFC' }}>
      <div className="text-center">
        <div className="text-4xl mb-4 animate-spin">⚙️</div>
        <p style={{ color: '#64748B' }}>Cargando datos...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <div className="sticky top-0 z-10 border-b" style={{ background: '#0F172A' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white opacity-60 hover:opacity-100 text-sm">← Inicio</Link>
            <span className="text-white opacity-30">/</span>
            <span className="text-white font-semibold text-sm">Panel Admin</span>
          </div>
          <div className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: '#0D9488', color: '#fff' }}>
            Administrador
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#0F172A' }}>Panel de Administración</h1>
          <p className="text-sm mb-8" style={{ color: '#64748B' }}>SOS Venezuela 2026 — {new Date().toLocaleDateString('es-VE', { dateStyle: 'full' })}</p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StatCard label="Usuarios" value={stats.users.total} sub={`+${stats.users.today} hoy · ${stats.users.google} Google`} color="#0D9488" />
            <StatCard label="Reportes" value={stats.reports.total} sub={`+${stats.reports.today} hoy · ${stats.reports.rojo} críticos`} color="#DC2626" />
            <StatCard label="Personas" value={stats.persons.total} sub={`${stats.persons.found} encontradas`} color="#7C3AED" />
            <StatCard label="Check-ins" value={stats.checkins.total} sub={`+${stats.checkins.today} hoy`} color="#2563EB" />
            <StatCard label="Chat msgs" value={stats.chats.total} color="#0F172A" />
            <StatCard label="Bloqueados" value={stats.mod_blocks.total} sub={`+${stats.mod_blocks.today} hoy`} color="#EA580C" />
          </div>

          {stats.traffic && <TrafficSection t={stats.traffic} />}

          <TweetManager />

          <div className="flex gap-2 mb-6">
            {(['users', 'reports'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: tab === t ? '#0D9488' : '#fff',
                  color: tab === t ? '#fff' : '#475569',
                  border: `1px solid ${tab === t ? '#0D9488' : '#E2E8F0'}`,
                }}>
                {t === 'users' ? `Usuarios (${stats.users.total})` : `Reportes (${stats.reports.total})`}
              </button>
            ))}
          </div>

          {tab === 'users' && (
            <div className="rounded-2xl overflow-auto" style={{ border: '1px solid #E2E8F0', background: '#fff' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    {['Correo', 'Nombre', 'Rol', 'Registro'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#475569' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_users.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom: i < stats.recent_users.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: '#0F172A' }}>{u.email}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#475569' }}>{u.full_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: u.role === 'admin' ? '#FEF3C7' : u.role === 'responder' ? '#DBEAFE' : '#F1F5F9', color: u.role === 'admin' ? '#92400E' : u.role === 'responder' ? '#1D4ED8' : '#475569' }}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#94A3B8' }}>
                        {new Date(u.created_at).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'reports' && (
            <div className="rounded-2xl overflow-auto" style={{ border: '1px solid #E2E8F0', background: '#fff' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    {['Título', 'Categoría', 'Severidad', 'Municipio', 'Fecha'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#475569' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_reports.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: i < stats.recent_reports.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                      <td className="px-4 py-3" style={{ maxWidth: '200px' }}>
                        <div className="text-xs font-medium truncate" style={{ color: '#0F172A' }}>{r.title}</div>
                        {r.verification === 'official_verified' && (
                          <span className="text-[10px] font-semibold" style={{ color: '#0D9488' }}>✓ Verificado</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#475569' }}>{CAT_LABEL[r.category] || r.category}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                          style={{ background: SEV_COLOR[r.severity] || '#64748B' }}>
                          {SEV_LABEL[r.severity] || r.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#475569' }}>{r.municipio}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#94A3B8' }}>
                        {new Date(r.created_at).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-center text-xs mt-8" style={{ color: '#CBD5E1' }}>
            Datos al cargar la página · SOS Venezuela 2026
          </p>
        </motion.div>
      </div>
    </div>
  );
}
