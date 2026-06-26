import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'API pública · SOS Venezuela 2026',
  description: 'Documentación de la API pública de solo lectura de SOS Venezuela 2026: personas, reportes de daños, estadísticas y centros de acopio. CORS abierto, datos abiertos para fines humanitarios.',
  alternates: { canonical: 'https://sosvenezuela2026.com/docs' },
};

const BASE = 'https://sosvenezuela2026.com';

interface Ep { method: string; path: string; desc: string; params?: [string, string][]; example: string; }

const ENDPOINTS: Ep[] = [
  {
    method: 'GET', path: '/api/reports',
    desc: 'Últimos 500 reportes en el mapa (edificios colapsados/dañados, fugas de gas, vías, centros de acopio, etc.). Coordenadas truncadas por privacidad (anti-saqueo).',
    example: `[{ "id": "...", "category": "collapsed_building", "severity": "rojo",
   "title": "...", "lat_pub": 10.61, "lng_pub": -67.0,
   "municipio": "...", "verification": "community_confirmed",
   "source_url": "...", "created_at": "2026-..." }]`,
  },
  {
    method: 'GET', path: '/api/persons/list',
    desc: 'Directorio público de personas reportadas (desaparecidas / encontradas). Cédulas enmascaradas, menores protegidos, contactos privados.',
    params: [['q', 'búsqueda por nombre (≥2 caracteres)'], ['estado', 'seeking_info | found_alive'], ['limit', '1–100 (def. 100)'], ['offset', 'paginación']],
    example: `[{ "id": "...", "status": "found_alive", "display_name": "...",
   "cedula_masked": "V-****1234", "municipio": "...",
   "hospital_name": "Hospital ...", "photo_path": "/fotos/....jpg" }]`,
  },
  {
    method: 'GET', path: '/api/persons/stats',
    desc: 'Cifras agregadas del directorio de personas.',
    example: `{ "missing": 56555, "found": 4907, "total": 61474 }`,
  },
  {
    method: 'GET', path: '/api/damage/recent',
    desc: 'Últimos análisis de validación de daño estructural con su veredicto comunitario.',
    example: `[{ "id": "...", "zona": "...", "municipio": "...",
   "building_type": "Apartamento / Edificio", "photo_ids": ["/fotos/....jpg"],
   "habitable_votes": 3, "inhabitable_votes": 5, "validations": 8 }]`,
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto px-4 pt-10">
        <Link href="/" className="text-sm font-medium" style={{ color: 'var(--primary)' }}>← Inicio</Link>
        <h1 className="font-display text-3xl font-bold mt-3 mb-2" style={{ color: 'var(--text-1)' }}>API pública</h1>
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-2)' }}>
          Los datos de SOS Venezuela 2026 son abiertos para fines humanitarios. Estos endpoints de
          <strong> solo lectura</strong> tienen <strong>CORS abierto</strong> — puedes consumirlos desde el
          navegador, un bot o un dashboard sin autenticación. Base: <code style={codeInline}>{BASE}</code>
        </p>

        <div className="rounded-2xl p-4 mb-8 text-sm" style={{ background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)', color: 'var(--text-2)' }}>
          <strong style={{ color: 'var(--text-1)' }}>Buenas prácticas:</strong> límite ~90 req/min por IP ·
          cachea las respuestas (traen <code style={codeInline}>Cache-Control</code>) · cita la fuente como
          «SOS Venezuela 2026» · respeta la privacidad: no intentes desanonimizar cédulas, coordenadas ni menores.
        </div>

        <div className="space-y-6">
          {ENDPOINTS.map(ep => (
            <div key={ep.path} className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md text-white" style={{ background: '#0D9488' }}>{ep.method}</span>
                <code className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{ep.path}</code>
              </div>
              <div className="p-4">
                <p className="text-sm mb-3" style={{ color: 'var(--text-2)' }}>{ep.desc}</p>
                {ep.params && (
                  <div className="mb-3">
                    <div className="text-xs font-bold mb-1.5" style={{ color: 'var(--text-3)' }}>PARÁMETROS</div>
                    <ul className="text-xs space-y-1" style={{ color: 'var(--text-2)' }}>
                      {ep.params.map(([k, v]) => <li key={k}><code style={codeInline}>{k}</code> — {v}</li>)}
                    </ul>
                  </div>
                )}
                <div className="text-xs font-bold mb-1.5" style={{ color: 'var(--text-3)' }}>EJEMPLO</div>
                <pre className="text-[11px] leading-relaxed overflow-x-auto rounded-xl p-3" style={{ background: '#0B1220', color: '#CBD5E1' }}><code>{ep.example}</code></pre>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 text-sm" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-2)' }}>
          <p className="mb-2"><strong style={{ color: 'var(--text-1)' }}>Código abierto.</strong> La plataforma es open-source — puedes auto-hospedarla o contribuir.</p>
          <a href="https://github.com/Z1Code/sosvenezuela2026" className="font-semibold" style={{ color: 'var(--primary)' }}>Repositorio en GitHub →</a>
        </div>
      </div>
    </div>
  );
}

const codeInline: React.CSSProperties = { background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 5, fontSize: '0.85em' };
