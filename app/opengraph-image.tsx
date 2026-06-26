import { ImageResponse } from 'next/og';

export const alt = 'SOS Venezuela 2026 — Mapa en vivo del terremoto';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: 72,
          background: 'linear-gradient(135deg, #0B1220 0%, #0F766E 60%, #0D9488 100%)',
          color: '#fff', fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: 64, height: 44, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ flex: 1, background: '#FFCC00' }} />
            <div style={{ flex: 1, background: '#00247D' }} />
            <div style={{ flex: 1, background: '#CF142B' }} />
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>SOS Venezuela 2026</div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(220,38,38,0.25)', border: '1px solid rgba(254,202,202,0.5)', padding: '8px 18px', borderRadius: 999, fontSize: 22, fontWeight: 600 }}>
            <div style={{ width: 12, height: 12, borderRadius: 999, background: '#F87171' }} /> EMERGENCIA ACTIVA
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2 }}>
            Mapa en vivo del
          </div>
          <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2, color: '#5EEAD4' }}>
            terremoto · M7.5
          </div>
          <div style={{ fontSize: 30, marginTop: 26, color: '#CBD5E1', maxWidth: 980 }}>
            Reportes de daños, búsqueda de personas, refugios y primeros auxilios — en tiempo real.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 26, color: '#94A3B8' }}>
          <div style={{ color: '#5EEAD4', fontWeight: 600 }}>sosvenezuela2026.com</div>
          <div>Uso humanitario · 24 jun 2026</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
