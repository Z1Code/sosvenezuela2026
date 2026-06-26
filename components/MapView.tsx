'use client';
import { useEffect, useRef, useState } from 'react';
import { useSse, HazardEvent } from '@/app/sse-provider';
import type * as Leaflet from 'leaflet';

const SISMOS = [
  { id: 's1', etiqueta: 'Sismo 1 · M7.1', lat: 10.4360, lng: -68.5277, profundidad: '~13–20 km', fecha: '24-jun-2026 17:04 VET', lugar: '~23 km SE de Yumare' },
  { id: 's2', etiqueta: 'Sismo 2 · M7.5', lat: 10.4530, lng: -68.5139, profundidad: '10 km (superficial)', fecha: '24-jun-2026 17:05 VET', lugar: 'Morón / Puerto Cabello' },
];

const SEV_COLORS: Record<string, string> = { verde: '#16A34A', amarillo: '#EAB308', naranja: '#EA580C', rojo: '#DC2626' };
const SEV_LABELS: Record<string, string> = { verde: 'Leve', amarillo: 'Dañado', naranja: 'Severo', rojo: 'Colapso' };
const CAT_LABELS: Record<string, string> = {
  collapsed_building: 'Edificio colapsado', damaged_building: 'Edificio dañado',
  trapped_people: 'Personas atrapadas', fire: 'Incendio', gas_leak: 'Fuga de gas',
  blocked_road: 'Vía bloqueada', flooding: 'Inundación', medical_need: 'Necesidad médica',
  shelter: 'Refugio', water_point: 'Agua potable', aid_point: 'Punto de ayuda',
};
const CAT_ICONS: Record<string, string> = {
  collapsed_building: '🏚️', damaged_building: '🏢', trapped_people: '🆘', fire: '🔥', gas_leak: '⛽',
  blocked_road: '🚧', flooding: '🌊', medical_need: '🚑', shelter: '🏕️', water_point: '💧', aid_point: '📦',
};
const VER_LABELS: Record<string, string> = {
  official_verified: '✅ Verificado oficial', community_confirmed: '👥 Confirmado por comunidad', unverified: '⌛ Sin verificar',
};
const VER_BG: Record<string, string> = {
  official_verified: 'background:#F0FDF4;color:#15803D', community_confirmed: 'background:#EFF6FF;color:#1D4ED8', unverified: 'background:#FEF9C3;color:#854D0E',
};
function esc(s: string) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function colorFor(r: HazardEvent) {
  if (r.severity && SEV_COLORS[r.severity]) return SEV_COLORS[r.severity];
  if (/shelter|water|aid/.test(r.category)) return '#0D9488';
  return '#64748B';
}

interface Props {
  initialReports: HazardEvent[];
  onReportClick?: (r: HazardEvent) => void;
  flyTo?: { id: string; lat: number; lng: number; nonce: number } | null;
  hide?: string[];
}

export default function MapView({ initialReports, onReportClick, flyTo, hide }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Leaflet.Map | null>(null);
  const Lref = useRef<typeof Leaflet | null>(null);
  const markersRef = useRef<Map<string, Leaflet.CircleMarker>>(new Map());
  const fitted = useRef(false);
  const clickRef = useRef(onReportClick);
  clickRef.current = onReportClick;
  const [ready, setReady] = useState(false);
  const { hazards } = useSse();

  // ── init map once ──────────────────────────────
  useEffect(() => {
    const container = mapRef.current;
    if (!container || mapInstance.current) return;
    if ((container as unknown as { _leaflet_id?: number })._leaflet_id) return;

    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default as unknown as typeof Leaflet;
      if (cancelled || mapInstance.current) return;
      if ((container as unknown as { _leaflet_id?: number })._leaflet_id) return;
      Lref.current = L;

      const map = L.map(container, { center: [10.46, -68.2], zoom: 9, zoomControl: true });
      if (cancelled) { map.remove(); return; }

      L.tileLayer(process.env.NEXT_PUBLIC_TILE_URL || 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd', maxZoom: 19,
      }).addTo(map);

      SISMOS.forEach(s => {
        const icon = L.divIcon({
          className: '',
          html: `<div style="position:relative;width:30px;height:30px;">
            <div style="position:absolute;inset:0;border-radius:50%;background:#DC2626;opacity:0.3;animation:pulse-ring 2s ease-out infinite;"></div>
            <div style="position:absolute;inset:6px;border-radius:50%;background:#DC2626;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;font-weight:bold;">M${s.id === 's2' ? '7.5' : '7.1'}</div>
          </div>`,
          iconSize: [30, 30], iconAnchor: [15, 15],
        });
        L.marker([s.lat, s.lng], { icon }).addTo(map).bindPopup(
          `<div style="min-width:200px"><div style="font-weight:bold;color:#DC2626;font-size:13px">🔴 ${s.etiqueta}</div>
           <div style="font-size:12px;margin-top:4px;color:#374151"><b>Fecha:</b> ${s.fecha}<br><b>Lugar:</b> ${s.lugar}<br><b>Profundidad:</b> ${s.profundidad}<br><b>Datos:</b> USGS (preliminar)</div></div>`
        );
      });

      mapInstance.current = map;
      setReady(true);
      // Leaflet sometimes mis-measures inside a freshly laid-out flex container.
      setTimeout(() => map.invalidateSize(), 200);
    })();

    return () => {
      cancelled = true;
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
      markersRef.current.clear();
      fitted.current = false;
      Lref.current = null;
      setReady(false);
    };
  }, []);

  // ── sync markers from data (idempotent) ────────
  useEffect(() => {
    const L = Lref.current, map = mapInstance.current;
    if (!ready || !L || !map) return;

    const hideSet = new Set(hide || []);
    const all = [...initialReports, ...hazards].filter(r => !hideSet.has(r.category));
    for (const r of all) {
      if (markersRef.current.has(r.id)) continue;
      if (typeof r.lat_pub !== 'number' || typeof r.lng_pub !== 'number') continue;
      const color = colorFor(r);
      const verified = r.verification === 'official_verified';
      const marker = L.circleMarker([r.lat_pub, r.lng_pub], {
        radius: r.severity === 'rojo' ? 11 : 8,
        fillColor: color, color: verified ? '#fff' : color,
        weight: verified ? 2.5 : 1.5, opacity: 1, fillOpacity: 0.9,
      });
      const sevPill = r.severity ? `<span style="font-size:10px;font-weight:700;color:#fff;background:${SEV_COLORS[r.severity]};padding:2px 8px;border-radius:999px">${SEV_LABELS[r.severity] || r.severity}</span>` : '';
      const catLabel = `${CAT_ICONS[r.category] || '📌'} ${CAT_LABELS[r.category] || r.category}`;
      const verPill = `<span style="font-size:10px;font-weight:600;${VER_BG[r.verification] || VER_BG.unverified};padding:2px 8px;border-radius:999px">${VER_LABELS[r.verification] || ''}</span>`;
      const when = new Date(r.created_at).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      marker.bindPopup(
        `<div style="width:256px;font-family:system-ui;-webkit-font-smoothing:antialiased">
          ${r.image_url ? `<div style="position:relative;margin:-2px -2px 8px;border-radius:12px;overflow:hidden">
            <img src="${esc(r.image_url)}" alt="" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:150px;object-fit:cover;display:block" onerror="this.parentNode.style.display='none'"/>
            <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.35),transparent 45%)"></div>
            <div style="position:absolute;left:8px;bottom:7px;display:flex;gap:5px">${sevPill}</div>
          </div>` : ''}
          <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-bottom:5px">
            <span style="font-size:10px;font-weight:600;color:#0F766E;background:#F0FDFA;padding:2px 8px;border-radius:999px">${catLabel}</span>
            ${r.image_url ? '' : sevPill}
          </div>
          <div style="font-weight:700;font-size:14px;line-height:1.25;color:#0F172A;margin-bottom:3px">${esc(r.title || CAT_LABELS[r.category] || r.category)}</div>
          <a href="https://www.google.com/maps/search/?api=1&query=${r.lat_pub},${r.lng_pub}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#0D9488;font-weight:600;text-decoration:none;margin-bottom:6px;display:inline-block">📍 ${esc([r.parroquia, r.municipio].filter(Boolean).join(', ') || 'Ubicación aproximada')} · ver en Maps ↗</a>
          <div style="margin-bottom:7px">${verPill}</div>
          ${r.description ? `<div style="font-size:11.5px;color:#374151;line-height:1.45;margin-bottom:8px">${esc(r.description)}</div>` : ''}
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #F1F5F9;padding-top:7px">
            <span style="font-size:10px;color:#94A3B8">🕒 ${when}</span>
            ${r.source_url ? `<a href="${esc(r.source_url)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;font-weight:700;color:#0D9488;text-decoration:none;background:#F0FDFA;padding:4px 10px;border-radius:8px;white-space:nowrap">🔗 Ver fuente</a>` : ''}
          </div>
        </div>`,
        { maxWidth: 280, minWidth: 256 }
      );
      marker.on('click', () => clickRef.current?.(r));
      marker.addTo(map);
      markersRef.current.set(r.id, marker);
    }

    // Fit once to the affected coastal region (epicenters + nearby reports).
    // Outliers far from the disaster zone (e.g. Táchira) stay on the map but
    // don't blow out the initial view.
    if (!fitted.current && markersRef.current.size > 0) {
      const inZone = (la: number, ln: number) => la > 9.6 && la < 11.3 && ln > -69.5 && ln < -65.5;
      const pts: [number, number][] = [
        ...SISMOS.map(s => [s.lat, s.lng] as [number, number]),
        ...all.filter(r => typeof r.lat_pub === 'number' && inZone(r.lat_pub, r.lng_pub)).map(r => [r.lat_pub, r.lng_pub] as [number, number]),
      ];
      if (pts.length) { map.fitBounds(L.latLngBounds(pts), { padding: [42, 42], maxZoom: 11 }); fitted.current = true; }
    }
  }, [ready, initialReports, hazards]);

  // ── fly to a selected report ───────────────────
  useEffect(() => {
    const map = mapInstance.current;
    if (!ready || !flyTo || !map) return;
    // Cinematic approach: ease out, then settle deeper, then open the popup.
    map.flyTo([flyTo.lat, flyTo.lng], 16, { duration: 1.5, easeLinearity: 0.18 });
    const m = markersRef.current.get(flyTo.id);
    if (m) {
      const el = (m as unknown as { _path?: SVGElement })._path;
      if (el) { el.classList.remove('marker-ping'); void el.getBoundingClientRect(); el.classList.add('marker-ping'); }
      setTimeout(() => m.openPopup(), 1050);
    }
  }, [ready, flyTo]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />;
}
