// Barrido de noticias horario (corre en el Mac, usa Ollama local para geolocalizar).
// Google News RSS -> Ollama extrae {daño, lugar, categoría} -> Nominatim geocodifica
// -> inserta en el mapa como 'unverified' con fuente y foto (best-effort). Dedupe estricto.
try { require('fs').readFileSync(__dirname + '/.env', 'utf8').split('\n').forEach(l => { const i = l.indexOf('='); if (i > 0 && !l.startsWith('#')) { const k = l.slice(0, i).trim(); if (!process.env[k]) process.env[k] = l.slice(i + 1).trim(); } }); } catch { /* no .env */ }
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const ADMIN = 'a0000000-0000-0000-0000-000000000001';
const OLLAMA = 'http://localhost:11434/api/generate';
const MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
const MAX_PER_RUN = 25;

const FEEDS = [
  'https://news.google.com/rss/search?q=terremoto%20Venezuela%20(colapso%20OR%20edificio%20OR%20derrumbe%20OR%20da%C3%B1os%20OR%20rescate)&hl=es-419&gl=VE&ceid=VE:es',
  'https://news.google.com/rss/search?q=sismo%20Venezuela%20La%20Guaira%20OR%20Caracas%20OR%20Carabobo%20da%C3%B1os&hl=es-419&gl=VE&ceid=VE:es',
];
const CAT_SEV = {
  collapsed_building: 'rojo', damaged_building: 'naranja', trapped_people: 'rojo', fire: 'naranja',
  gas_leak: 'naranja', blocked_road: 'amarillo', flooding: 'naranja', medical_need: 'naranja',
  shelter: null, aid_point: null,
};

function decode(s) {
  return (s || '').replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}
function parseRss(xml) {
  return xml.split('<item>').slice(1).map(chunk => {
    const t = chunk.match(/<title>([\s\S]*?)<\/title>/);
    const l = chunk.match(/<link>([\s\S]*?)<\/link>/);
    return { title: decode(t && t[1]), link: decode(l && l[1]) };
  }).filter(x => x.title && x.link);
}

async function ollama(title) {
  const prompt = `Eres un extractor para un mapa de emergencia del terremoto en Venezuela (24-jun-2026).
Dado este TITULAR de noticia, responde SOLO JSON con:
{"dano": true|false, "lugar": "lugar específico (edificio/urbanización/sector/ciudad) en Venezuela o ''", "municipio": "municipio/ciudad o ''", "categoria": "uno de: collapsed_building, damaged_building, trapped_people, fire, gas_leak, blocked_road, flooding, medical_need, shelter, aid_point, ''", "resumen": "frase corta"}
"dano" es true SOLO si reporta daño físico real (colapso, derrumbe, grietas, incendio, atrapados, refugio) en un LUGAR concreto de Venezuela. Si es genérico, política, o sin lugar, dano=false.
TITULAR: "${title.replace(/"/g, "'")}"`;
  const r = await fetch(OLLAMA, { method: 'POST', body: JSON.stringify({ model: MODEL, prompt, stream: false, format: 'json', options: { temperature: 0 } }) });
  const j = await r.json();
  return JSON.parse(j.response);
}

async function geocode(place, muni) {
  const q = [place, muni, 'Venezuela'].filter(Boolean).join(', ');
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=ve`;
  const r = await fetch(url, { headers: { 'User-Agent': 'sosvenezuela2026.com/1.0 (humanitarian map)' } });
  const j = await r.json();
  if (!Array.isArray(j) || !j.length) return null;
  const lat = parseFloat(j[0].lat), lng = parseFloat(j[0].lon);
  if (lat < 0.6 || lat > 12.5 || lng < -73.5 || lng > -59.5) return null;
  return { lat, lng };
}

async function ogImage(link) {
  try {
    const r = await fetch(link, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
    const html = await r.text();
    const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return m ? m[1] : null;
  } catch { return null; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const ts = new Date().toISOString();
  await pool.query('create table if not exists news_seen (url text primary key, created_at timestamptz default now())');
  const ex = (await pool.query('select lat_pub,lng_pub from hazard_reports where deleted_at is null')).rows;
  const near = (la, ln) => ex.some(e => Math.abs(e.lat_pub - la) < 0.005 && Math.abs(e.lng_pub - ln) < 0.005);

  let items = [];
  for (const f of FEEDS) { try { const x = await (await fetch(f)).text(); items = items.concat(parseRss(x)); } catch { /* skip feed */ } }
  // dedupe by link, filter already-seen
  const uniq = []; const seen = new Set();
  for (const it of items) { if (seen.has(it.link)) continue; seen.add(it.link); uniq.push(it); }

  let processed = 0, added = 0, skipped = 0;
  for (const it of uniq) {
    if (processed >= MAX_PER_RUN) break;
    const already = await pool.query('select 1 from news_seen where url=$1', [it.link]);
    if (already.rows.length) continue;
    await pool.query('insert into news_seen (url) values ($1) on conflict do nothing', [it.link]);
    processed++;
    let ex2;
    try { ex2 = await ollama(it.title); } catch { skipped++; continue; }
    if (!ex2 || !ex2.dano || !ex2.lugar || ex2.lugar.length < 3) { skipped++; continue; }
    await sleep(1100); // Nominatim courtesy
    let geo; try { geo = await geocode(ex2.lugar, ex2.municipio); } catch { geo = null; }
    if (!geo) { skipped++; continue; }
    const lat = Math.trunc(geo.lat * 1000) / 1000, lng = Math.trunc(geo.lng * 1000) / 1000;
    if (near(lat, lng)) { skipped++; continue; }
    // Las estructuras (edificios) y personas atrapadas vienen de fuentes dedicadas
    // (terremotovenezuela, X geoconfirmado, plataformas de personas). El barrido de
    // noticias NO crea estructuras para no contaminarlas con titulares.
    const STRUCT = new Set(['collapsed_building', 'damaged_building', 'trapped_people']);
    const cat = CAT_SEV.hasOwnProperty(ex2.categoria) ? ex2.categoria : null;
    if (!cat || STRUCT.has(cat)) { skipped++; continue; }
    const sev = CAT_SEV[cat];
    const img = await ogImage(it.link);
    // Título limpio (categoría + lugar), nunca el titular crudo. El titular va en la descripción.
    const catLabel = { fire: 'Incendio', gas_leak: 'Fuga de gas', blocked_road: 'Vía bloqueada', flooding: 'Inundación', medical_need: 'Necesidad médica', shelter: 'Refugio', aid_point: 'Punto de ayuda' }[cat] || 'Reporte';
    const cleanTitle = `${catLabel} — ${(ex2.lugar || ex2.municipio || 'zona afectada')}`.slice(0, 90);
    const desc = `${ex2.resumen || it.title} — Reportado por prensa (sin verificación oficial en sitio). Ubicación aproximada.`;
    await pool.query(
      `insert into hazard_reports (category,severity,verification,title,description,lat_pub,lng_pub,municipio,parroquia,source_url,image_url,reporter_id,created_at)
       values ($1,$2,'unverified',$3,$4,$5,$6,$7,$8,$9,$10,$11,now())`,
      [cat, sev, cleanTitle, desc.slice(0, 500), lat, lng, ex2.municipio || null, ex2.lugar.slice(0, 120) || null, it.link, img, ADMIN]
    );
    ex.push({ lat_pub: lat, lng_pub: lng }); added++;
  }
  console.log(ts, 'NEWS', JSON.stringify({ feeds: items.length, procesados: processed, agregados: added, descartados: skipped }));
  await pool.end();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
