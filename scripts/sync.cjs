// Auto-sync: venezuelatebusca (personas) + terremotovenezuela (edificios) + mirror de fotos.
// Idempotente: dedupe por id/cédula/proximidad. Pensado para correr cada hora por cron.
try { require('fs').readFileSync(__dirname + '/.env', 'utf8').split('\n').forEach(l => { const i = l.indexOf('='); if (i > 0 && !l.startsWith('#')) { const k = l.slice(0, i).trim(); if (!process.env[k]) process.env[k] = l.slice(i + 1).trim(); } }); } catch { /* no .env */ }
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 6 });
const ADMIN = 'a0000000-0000-0000-0000-000000000001';

// Claves anon/publishable de plataformas ciudadanas de terceros (fuentes de datos).
// Se leen del entorno — ver .env.example. No se versionan.
const VTB = process.env.VTB_URL || 'https://ihcnbvkwkiyxlkhuwapu.supabase.co';
const VTB_KEY = process.env.VTB_KEY || '';
const TVE = process.env.TVE_URL || 'https://jckifxsdlnsvbztxydes.supabase.co';
const TVE_KEY = process.env.TVE_KEY || '';

const uuid = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || '');
const norm = c => { const x = (c || '').toUpperCase().replace(/[^0-9A-Z]/g, ''); return x || null; };
const t3 = n => Math.trunc(n * 1000) / 1000;
const render = u => u && u.includes('/object/public/') ? u.replace('/object/public/', '/render/image/public/') + '?width=256&quality=60' : null;

// ── Deduplicador mejorado: firma de identidad nombre + (cédula › edad › zona) ──
const pnorm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const ptok = s => pnorm(s).split(' ')[0] || '';
const pAge = note => { const m = /edad:\s*(\d{1,3})/i.exec(note || ''); return m ? parseInt(m[1]) : null; };
function psig(name, ced, age, loc) { const nk = pnorm(name); if (!nk || nk === 'sin nombre') return null; if (ced) return nk + '#c' + ced; if (age != null) return nk + '#a' + age; if (ptok(loc)) return nk + '#l' + ptok(loc); return null; }
async function buildExSig() {
  const r = await pool.query("select given_name, cedula_norm, parroquia, note_text from person_reports where deleted_at is null");
  const set = new Set();
  for (const x of r.rows) { const s = psig(x.given_name, x.cedula_norm, pAge(x.note_text), x.parroquia); if (s) set.add(s); }
  return set;
}

async function fetchAll(base, key, table, select) {
  let all = [], from = 0;
  while (true) {
    const r = await fetch(`${base}/rest/v1/${table}?select=${select}&order=created_at.asc`,
      { headers: { apikey: key, Authorization: 'Bearer ' + key, Range: `${from}-${from + 999}` } });
    if (!r.ok) break;
    const p = await r.json(); if (!Array.isArray(p) || !p.length) break;
    all = all.concat(p); from += 1000; if (p.length < 1000) break;
  }
  return all;
}

async function syncPersons() {
  const all = await fetchAll(VTB, VTB_KEY, 'desaparecidos', 'id,nombre,apellido,cedula,edad,genero,descripcion,notas,foto_url,ultima_ubicacion,estado,reportado_por_telefono,created_at');
  const rows = (await pool.query('select id,status from person_reports where deleted_at is null')).rows;
  const ours = new Map(rows.map(r => [r.id, r.status]));
  const exC = new Set((await pool.query('select distinct cedula_norm from person_reports where cedula_norm is not null')).rows.map(r => r.cedula_norm));
  const exSig = await buildExSig();
  let updated = 0, ins = 0, toIns = [], seen = new Set();
  for (const p of all) {
    const found = /encontrad/i.test(p.estado || '');
    if (ours.has(p.id)) {
      if (found && ours.get(p.id) !== 'found_alive') { await pool.query("update person_reports set status='found_alive' where id=$1", [p.id]); updated++; }
      continue;
    }
    const cn = norm(p.cedula); if (cn && exC.has(cn)) continue;
    if (uuid(p.id)) { if (seen.has(p.id)) continue; seen.add(p.id); }
    const name = ((p.nombre || '') + ' ' + (p.apellido || '')).trim() || 'Sin nombre';
    const edad = p.edad != null ? parseInt(p.edad) : null;
    const sg = psig(name, cn, edad, p.ultima_ubicacion); if (sg) { if (exSig.has(sg)) continue; exSig.add(sg); }
    const isMinor = Number.isFinite(edad) && edad > 0 && edad < 18;
    const note = [p.descripcion, p.notas, edad ? 'Edad: ' + edad : '', '(registro de venezuelatebusca.com)'].filter(Boolean).join(' · ').slice(0, 500);
    toIns.push({ id: uuid(p.id) ? p.id : null, status: found ? 'found_alive' : 'seeking_info', cedula: p.cedula || null, ct: p.cedula ? 'V' : null, name, isMinor, sex: p.genero || null, parr: (p.ultima_ubicacion || '').slice(0, 120) || null, note, tel: p.reportado_por_telefono || null, foto: p.foto_url || null, sd: p.created_at || null });
    if (cn) exC.add(cn);
  }
  for (let i = 0; i < toIns.length; i += 200) {
    const ch = toIns.slice(i, i + 200), vals = [], ph = []; let n = 1;
    for (const r of ch) { ph.push(`($${n},$${n + 1},$${n + 2},$${n + 3},$${n + 4},$${n + 5},$${n + 6},$${n + 7},$${n + 8},$${n + 9},$${n + 10},$${n + 11},$${n + 12},$${n + 13},coalesce($${n + 14}::timestamptz,now()))`); vals.push(r.id, r.status, r.cedula, r.ct, r.name, r.name, r.isMinor, r.sex, null, r.parr, r.note, r.tel, r.foto, ADMIN, r.sd); n += 15; }
    const res = await pool.query('insert into person_reports (id,status,cedula,cedula_type,given_name,full_name,is_minor,sex,municipio,parroquia,note_text,reporter_contact,photo_path,reporter_id,source_date) values ' + ph.join(',') + ' on conflict (id) do nothing', vals);
    ins += res.rowCount;
  }
  return { fuente: all.length, nuevos: ins, encontrados_actualizados: updated };
}

async function syncBuildings() {
  const B = await fetchAll(TVE, TVE_KEY, 'buildings', 'id,name,address,city,zone,lat,lng,damage_level,notes');
  // dedupe SOLO contra edificios (no personas/acopios/noticias), proximidad ~65m
  const ex = (await pool.query("select lat_pub,lng_pub from hazard_reports where category in ('collapsed_building','damaged_building') and deleted_at is null")).rows;
  const near = (la, ln) => ex.some(e => Math.abs(e.lat_pub - la) < 0.0006 && Math.abs(e.lng_pub - ln) < 0.0006);
  const mapLv = l => l === 'total' ? ['collapsed_building', 'rojo'] : l === 'severo' ? ['damaged_building', 'naranja'] : ['damaged_building', 'amarillo'];
  let ins = 0;
  for (const b of B) {
    if (typeof b.lat !== 'number' || typeof b.lng !== 'number') continue;
    if (!uuid(b.id)) continue;
    const lat = t3(b.lat), lng = t3(b.lng);
    if (near(lat, lng)) continue;
    const [cat, sev] = mapLv(b.damage_level);
    const desc = ((b.notes || '').trim() + ' — Fuente: terremotovenezuela.com (mapa comunitario). Sin verificación oficial en sitio.').trim();
    const res = await pool.query(
      `insert into hazard_reports (id,category,severity,verification,title,description,lat_pub,lng_pub,municipio,parroquia,source_url,reporter_id)
       values ($1,$2,$3,'community_confirmed',$4,$5,$6,$7,$8,$9,'https://terremotovenezuela.com/',$10)
       on conflict (id) do nothing`,
      [b.id, cat, sev, (b.name || 'Edificio afectado').slice(0, 90), desc, lat, lng, b.city || null, b.zone || null, ADMIN]);
    ins += res.rowCount;
    if (res.rowCount) ex.push({ lat_pub: lat, lng_pub: lng });
  }
  return { fuente: B.length, nuevos: ins };
}

const ACOPIOS_SHEET = 'https://docs.google.com/spreadsheets/d/1OTNQGMsK3nU2wqy00rtPPcwsSzAlorWeP-uIotWpkxM/edit?gid=0';
const ACOPIOS_CSV = 'https://docs.google.com/spreadsheets/d/1OTNQGMsK3nU2wqy00rtPPcwsSzAlorWeP-uIotWpkxM/export?format=csv&gid=0';
const sleep = ms => new Promise(r => setTimeout(r, ms));
function parseCSV(t) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else { if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c; } }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
async function geocodeVE(qy) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(qy)}&format=json&limit=1&countrycodes=ve`, { headers: { 'User-Agent': 'sosvenezuela2026.com/1.0' } });
    const j = await r.json(); if (!Array.isArray(j) || !j.length) return null;
    const lat = parseFloat(j[0].lat), lng = parseFloat(j[0].lon);
    if (lat < 0.6 || lat > 12.5 || lng < -73.5 || lng > -59.5) return null;
    return { lat, lng };
  } catch { return null; }
}
function jitter(seed) { const a = (seed * 9301 + 49297) % 233280 / 233280, b = (seed * 4099 + 7919) % 233280 / 233280; return { dlat: (a - 0.5) * 0.008, dlng: (b - 0.5) * 0.008 }; }

async function syncAcopios() {
  const rows = parseCSV(await (await fetch(ACOPIOS_CSV)).text()); rows.shift();
  const existing = new Set((await pool.query("select id::text as id from hazard_reports where id::text like 'b7000000-%'")).rows.map(r => r.id));
  const cityCache = {}; let added = 0, fail = 0;
  for (const r of rows) {
    const [sid, quien, dir, coords, ciudad, , que, contacto] = r;
    if ((!quien && !dir) || !sid) continue;
    const id = 'b7000000-0000-0000-0000-' + String(sid).replace(/\D/g, '').padStart(12, '0').slice(-12);
    if (existing.has(id)) continue;
    let lat, lng;
    const m = (coords || '').match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{2,3}\.\d+)/);
    if (m) { lat = parseFloat(m[1]); lng = parseFloat(m[2]); }
    else {
      if (dir) { await sleep(1100); const g = await geocodeVE([dir, ciudad, 'Venezuela'].filter(Boolean).join(', ')); if (g) { lat = g.lat; lng = g.lng; } }
      if ((typeof lat !== 'number' || isNaN(lat)) && ciudad) {
        const key = ciudad.trim().toLowerCase();
        if (!(key in cityCache)) { await sleep(1100); cityCache[key] = await geocodeVE(ciudad + ', Venezuela'); }
        const g = cityCache[key]; if (g) { const j = jitter(parseInt(String(sid).replace(/\D/g, '')) || 1); lat = g.lat + j.dlat; lng = g.lng + j.dlng; }
      }
    }
    if (typeof lat !== 'number' || isNaN(lat) || lat < 0.6 || lat > 12.5) { fail++; continue; }
    const latp = Math.trunc(lat * 1000) / 1000, lngp = Math.trunc(lng * 1000) / 1000;
    const desc = [que ? 'Recibe: ' + que : '', dir ? 'Dirección: ' + dir : '', contacto ? 'Contacto: ' + contacto : ''].filter(Boolean).join(' · ').slice(0, 500);
    await pool.query(
      `insert into hazard_reports (id,category,severity,resource_status,verification,title,description,lat_pub,lng_pub,municipio,source_url,reporter_id)
       values ($1,'aid_point',null,'open','community_confirmed',$2,$3,$4,$5,$6,$7,$8)
       on conflict (id) do update set description=excluded.description, title=excluded.title`,
      [id, ('Centro de acopio — ' + (quien || 'Punto de ayuda')).slice(0, 90), desc, latp, lngp, ciudad || null, ACOPIOS_SHEET, ADMIN]);
    added++;
  }
  return { fuente: rows.length, nuevos: added, sin_ubicar: fail };
}

// desaparecidosterremotovenezuela.com (API theempire) — fotos en S3 (se referencian).
const DTTV_API = 'https://desaparecidos-terremoto-api.theempire.tech/api/personas';
const nnorm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
const ntok = s => nnorm(s).split(/\s+/)[0] || '';
async function syncDttv() {
  const exExt = new Set((await pool.query("select ext_id from person_reports where ext_id like 'dttv:%'")).rows.map(r => r.ext_id));
  const exSig = await buildExSig();
  let first; try { first = await (await fetch(DTTV_API + '?page=1&pageSize=100')).json(); } catch { return { error: 'fetch' }; }
  const pages = first.totalPages || 1; let added = 0, batch = [];
  async function flush() {
    if (!batch.length) return;
    const vals = [], ph = []; let n = 1;
    for (const r of batch) { ph.push(`($${n},$${n + 1},$${n + 2},$${n + 3},$${n + 4},$${n + 5},$${n + 6},$${n + 7},$${n + 8},$${n + 9},$${n + 10},coalesce($${n + 11}::timestamptz,now()))`); vals.push(r.status, r.name, r.name, r.isMinor, r.sex, r.parr, r.note, r.tel, r.foto, ADMIN, r.ext, r.sd); n += 12; }
    const res = await pool.query('insert into person_reports (status,given_name,full_name,is_minor,sex,parroquia,note_text,reporter_contact,photo_path,reporter_id,ext_id,source_date) values ' + ph.join(',') + ' on conflict (ext_id) do nothing', vals);
    added += res.rowCount; batch = [];
  }
  for (let p = 1; p <= pages; p++) {
    let data; try { data = await (await fetch(`${DTTV_API}?page=${p}&pageSize=100`)).json(); } catch { continue; }
    for (const it of (data.items || [])) {
      const ext = 'dttv:' + it.id; if (exExt.has(ext)) continue; exExt.add(ext);
      const name = (it.nombre || 'Sin nombre').trim();
      const edad = Number.isFinite(it.edad) ? it.edad : null;
      const sg = psig(name, null, edad, it.ubicacion); if (sg) { if (exSig.has(sg)) continue; exSig.add(sg); }
      const status = /localizad/i.test(it.estado || '') ? 'found_alive' : 'seeking_info';
      const note = [it.descripcion, edad ? 'Edad: ' + edad : '', '(registro de desaparecidosterremotovenezuela.com)'].filter(Boolean).join(' · ').slice(0, 500);
      const foto = (it.foto || '').startsWith('http') ? it.foto : null;
      batch.push({ status, name, isMinor: edad != null && edad > 0 && edad < 18, sex: null, parr: (it.ubicacion || '').slice(0, 120) || null, note, tel: it.contacto || null, foto, ext, sd: it.createdAt ? new Date(it.createdAt).toISOString() : null });
      if (batch.length >= 200) await flush();
    }
  }
  await flush();
  return { fuente: first.total, nuevos: added };
}

// desaparecidosvenezuela.com — solo expone las ~20 más recientes (sin paginación);
// el cron las capta cada hora y dedupe. Foto en /api/personas/<id>/foto.
const DVE_API = 'https://www.desaparecidosvenezuela.com/api/personas';
async function syncDesapVe() {
  let arr; try { arr = await (await fetch(DVE_API)).json(); } catch { return { error: 'fetch' }; }
  if (!Array.isArray(arr)) return { error: 'noarr' };
  const exExt = new Set((await pool.query("select ext_id from person_reports where ext_id like 'dve:%'")).rows.map(r => r.ext_id));
  const exSig = await buildExSig();
  let added = 0;
  for (const it of arr) {
    const ext = 'dve:' + it.id; if (exExt.has(ext)) continue;
    const name = (it.nombre || 'Sin nombre').trim();
    const edad = Number.isFinite(it.edad) ? it.edad : null;
    const sg = psig(name, null, edad, it.zona); if (sg) { if (exSig.has(sg)) continue; exSig.add(sg); }
    const status = /encontr|localiz/i.test((it.estado || '') + (it.tipo || '')) ? 'found_alive' : 'seeking_info';
    const note = [it.descripcion, edad ? 'Edad: ' + edad : '', '(registro de desaparecidosvenezuela.com)'].filter(Boolean).join(' · ').slice(0, 500);
    const foto = it.fotoUrl ? (it.fotoUrl.startsWith('http') ? it.fotoUrl : 'https://www.desaparecidosvenezuela.com' + it.fotoUrl) : null;
    await pool.query(
      `insert into person_reports (status,given_name,full_name,is_minor,parroquia,note_text,photo_path,reporter_id,ext_id,source_date)
       values ($1,$2,$2,$3,$4,$5,$6,$7,$8,coalesce($9::timestamptz,now())) on conflict (ext_id) do nothing`,
      [status, name, edad != null && edad > 0 && edad < 18, (it.zona || '').slice(0, 120) || null, note, foto, ADMIN, ext, it.createdAt || null]);
    added++;
  }
  return { fuente: arr.length, nuevos: added };
}

async function mirrorPhotos(cap = 800) {
  const rows = (await pool.query("select id, photo_path from person_reports where photo_path like 'https://%/object/public/%' and deleted_at is null limit $1", [cap])).rows;
  let ok = 0, fail = 0;
  const CONC = 10; let i = 0;
  async function worker() {
    while (i < rows.length) {
      const r = rows[i++];
      try {
        const resp = await fetch(render(r.photo_path)); if (!resp.ok) { fail++; continue; }
        const buf = Buffer.from(await resp.arrayBuffer()); if (buf.length < 400) { fail++; continue; }
        const ins = await pool.query('insert into person_photos (mime,data) values ($1,$2) returning id', ['image/jpeg', buf]);
        await pool.query('update person_reports set photo_path=$1 where id=$2', ['/api/photo/' + ins.rows[0].id, r.id]);
        ok++;
      } catch { fail++; }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  return { intentadas: rows.length, ok, fail };
}

(async () => {
  const ts = new Date().toISOString();
  try { console.log(ts, 'PERSONS', JSON.stringify(await syncPersons())); } catch (e) { console.error(ts, 'PERSONS_ERR', e.message); }
  try { console.log(ts, 'BUILDINGS', JSON.stringify(await syncBuildings())); } catch (e) { console.error(ts, 'BUILDINGS_ERR', e.message); }
  try { console.log(ts, 'ACOPIOS', JSON.stringify(await syncAcopios())); } catch (e) { console.error(ts, 'ACOPIOS_ERR', e.message); }
  try { console.log(ts, 'DTTV', JSON.stringify(await syncDttv())); } catch (e) { console.error(ts, 'DTTV_ERR', e.message); }
  try { console.log(ts, 'DESAPVE', JSON.stringify(await syncDesapVe())); } catch (e) { console.error(ts, 'DESAPVE_ERR', e.message); }
  try { console.log(ts, 'MIRROR', JSON.stringify(await mirrorPhotos())); } catch (e) { console.error(ts, 'MIRROR_ERR', e.message); }
  await pool.end();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
