-- ============================================================
-- TERREMOTO VE — Schema Neon Postgres
-- Ejecutar CON conexión UNPOOLED (DATABASE_URL_UNPOOLED)
-- ============================================================

-- 1. ENUMS
create type severity        as enum ('verde','amarillo','naranja','rojo');
create type report_category as enum (
  'collapsed_building','damaged_building','trapped_people','fire','gas_leak',
  'blocked_road','flooding','medical_need',
  'shelter','water_point','aid_point');
create type resource_status as enum ('open','full','closed');
create type verification    as enum ('unverified','community_confirmed','official_verified','resolved','false_report');
create type person_status   as enum (
  'seeking_info','self_safe','found_alive','injured','hospitalized','sheltered','deceased','unknown');
create type cedula_type     as enum ('V','E');
create type user_role       as enum ('citizen','responder','admin');
create type triage_inside   as enum ('si','no','desconocido');
create type triage_occupancy as enum ('ocupado','vacante','desconocido');
create type building_type   as enum ('casa','apartamento','hospital','escuela','otro');

-- 2. USERS
create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  full_name     text,
  phone         text,
  role          user_role not null default 'citizen',
  created_at    timestamptz not null default now()
);
create index on users (email);

-- Seed admin user (password: admin123 - CAMBIAR INMEDIATAMENTE)
insert into users (id, email, password_hash, full_name, role) values (
  'a0000000-0000-0000-0000-000000000001',
  'admin@terremoto.ve',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LkZkSGxUXJG', -- bcrypt of "admin123"
  'Administrador',
  'admin'
);

-- 3. HAZARD REPORTS (public, jittered coords)
create table hazard_reports (
  id          uuid primary key default gen_random_uuid(),
  category    report_category not null,
  severity    severity,
  resource_status resource_status,
  verification verification not null default 'unverified',
  title       text,
  description text,
  lat_pub     double precision not null,
  lng_pub     double precision not null,
  parroquia   text,
  municipio   text,
  people_trapped_count   int,
  people_trapped_unknown boolean not null default false,
  anyone_inside triage_inside,
  occupancy   triage_occupancy,
  building_type building_type,
  confirms    int not null default 0,
  disputes    int not null default 0,
  reporter_id uuid not null references users(id),
  flagged_count int not null default 0,
  source_url  text,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index on hazard_reports (created_at);

-- 4. INCIDENT PRECISE (precise coords - staff only)
create table incident_precise (
  report_id uuid primary key references hazard_reports(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

-- 5. PERSON REPORTS
create table person_reports (
  id           uuid primary key default gen_random_uuid(),
  status       person_status not null,
  cedula       text,
  cedula_norm  text,
  cedula_type  cedula_type,
  given_name   text,
  family_name  text,
  full_name    text not null,
  is_minor     boolean not null default false,
  sex          text,
  age_min      int,
  age_max      int,
  phone        text,
  phone_norm   text,
  municipio    text,
  parroquia    text,
  hospital_name text,
  note_text    text,
  is_self_report boolean not null default false,
  photo_path   text,
  reporter_id  uuid not null references users(id),
  reporter_contact text,
  flagged_count int not null default 0,
  deleted_at   timestamptz,
  source_date  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  expiry_date  timestamptz not null default (now() + interval '90 days')
);
create index on person_reports (cedula_norm);
create index on person_reports (phone_norm);

create or replace function prep_person_report() returns trigger
  language plpgsql as $$
begin
  new.cedula_norm := nullif(upper(regexp_replace(coalesce(new.cedula,''), '[^0-9A-Za-z]', '', 'g')), '');
  new.phone_norm  := nullif(regexp_replace(coalesce(new.phone,''), '[^0-9+]', '', 'g'), '');
  return new;
end $$;
create trigger trg_prep_person before insert on person_reports
  for each row execute function prep_person_report();

create view person_public as
select
  id, status,
  case when cedula_norm is not null
       then coalesce(cedula_type::text,'') || '-****' || right(cedula_norm, 3)
       else null end as cedula_masked,
  case when is_minor then 'Menor reportado'
       else trim(coalesce(given_name,'') || ' ' ||
                 case when family_name is not null then left(family_name,1) || '.' else '' end)
  end as display_name,
  municipio, parroquia, hospital_name, source_date, photo_path
from person_reports
where deleted_at is null and status <> 'deceased';

-- 6. WATCH SUBSCRIPTIONS
create table watch_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  watcher_id  uuid not null references users(id),
  cedula_norm text not null,
  label       text,
  created_at  timestamptz not null default now()
);
create index on watch_subscriptions (cedula_norm);

-- 7. NOTIFICATIONS + match trigger
create table notifications (
  id               uuid primary key default gen_random_uuid(),
  watcher_id       uuid not null references users(id),
  person_report_id uuid not null references person_reports(id),
  cedula_norm      text not null,
  status           person_status not null,
  read_at          timestamptz,
  created_at       timestamptz not null default now()
);
create index on notifications (watcher_id, created_at);

create or replace function match_watch() returns trigger
  language plpgsql as $$
begin
  if new.cedula_norm is not null then
    insert into notifications (watcher_id, person_report_id, cedula_norm, status)
    select w.watcher_id, new.id, new.cedula_norm, new.status
    from watch_subscriptions w
    where w.cedula_norm = new.cedula_norm;
    perform pg_notify('match', new.cedula_norm);
  end if;
  return new;
end $$;
create trigger trg_match after insert on person_reports
  for each row execute function match_watch();

-- 8. CREATE HAZARD REPORT FUNCTION (server-side jitter)
create or replace function create_hazard_report(
  p_reporter_id uuid,
  p_category report_category, p_severity severity, p_resource_status resource_status,
  p_title text, p_description text,
  p_lat double precision, p_lng double precision,
  p_parroquia text, p_municipio text,
  p_trapped int, p_trapped_unknown boolean,
  p_inside triage_inside, p_occupancy triage_occupancy, p_building building_type
) returns uuid language plpgsql as $$
declare
  v_id uuid; d double precision; b double precision; dlat double precision; dlng double precision;
begin
  if (select count(*) from hazard_reports
      where reporter_id = p_reporter_id and created_at > now() - interval '10 minutes') >= 10 then
    raise exception 'Demasiados reportes en poco tiempo. Intenta de nuevo en unos minutos.';
  end if;
  d := 80 + random() * 170;
  b := random() * 2 * pi();
  dlat := (d * cos(b)) / 111320.0;
  dlng := (d * sin(b)) / (111320.0 * cos(radians(p_lat)));
  insert into hazard_reports (category, severity, resource_status, title, description,
    lat_pub, lng_pub, parroquia, municipio, people_trapped_count, people_trapped_unknown,
    anyone_inside, occupancy, building_type, reporter_id)
  values (p_category, p_severity, p_resource_status, p_title, p_description,
    round((p_lat + dlat)::numeric, 3), round((p_lng + dlng)::numeric, 3),
    p_parroquia, p_municipio, p_trapped, coalesce(p_trapped_unknown,false),
    p_inside, p_occupancy, p_building, p_reporter_id)
  returning id into v_id;
  insert into incident_precise (report_id, lat, lng) values (v_id, p_lat, p_lng);
  return v_id;
end $$;

-- 9. SEARCH PERSON FUNCTION
create or replace function search_person(p_cedula text, p_phone text, p_name text)
  returns setof person_public language plpgsql as $$
declare c text; ph text;
begin
  c  := nullif(upper(regexp_replace(coalesce(p_cedula,''), '[^0-9A-Za-z]', '', 'g')), '');
  ph := nullif(regexp_replace(coalesce(p_phone,''), '[^0-9+]', '', 'g'), '');
  if c is not null then
    return query select * from person_public pp where pp.id in
      (select id from person_reports where cedula_norm = c and deleted_at is null);
  elsif ph is not null then
    return query select * from person_public pp where pp.id in
      (select id from person_reports where phone_norm = ph and deleted_at is null);
  elsif p_name is not null and length(trim(p_name)) >= 3 then
    return query select * from person_public pp where pp.id in
      (select id from person_reports where full_name ilike '%'||p_name||'%'
       and deleted_at is null order by source_date desc limit 20);
  else
    raise exception 'Proporciona cédula, teléfono o al menos 3 letras del nombre.';
  end if;
end $$;

-- 10. CHAT MESSAGES
create table chat_messages (
  id         uuid primary key default gen_random_uuid(),
  channel    text not null default 'ops',
  estado     text,
  body       text not null,
  user_id    uuid not null references users(id),
  created_at timestamptz not null default now()
);
create index on chat_messages (channel, created_at);

-- 11. COMMUNITY INTERACTIONS
create table safe_checkin (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  estado text,
  msg    text,
  created_at timestamptz not null default now()
);
create index on safe_checkin (created_at);

create table report_comment (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references hazard_reports(id) on delete cascade,
  user_id uuid not null references users(id),
  body text not null,
  hidden boolean not null default false,
  flagged_count int not null default 0,
  created_at timestamptz not null default now()
);
create index on report_comment (report_id, created_at);

create table report_reaction (
  report_id uuid not null references hazard_reports(id) on delete cascade,
  user_id uuid not null references users(id),
  kind text not null check (kind in ('confirmo','sigue','resuelto','disputo')),
  created_at timestamptz not null default now(),
  primary key (report_id, user_id, kind)
);

-- 12. MODERATION LOG
create table moderacion_intentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  canal text,
  contenido_raw text,
  categorias text[],
  created_at timestamptz not null default now()
);
create index on moderacion_intentos (user_id, created_at);

-- 13. TWEETS (curated by admin; posted_at derived from snowflake id)
create table tweets (
  id         uuid primary key default gen_random_uuid(),
  tweet_id   text not null unique,
  url        text not null,
  posted_at  timestamptz not null,
  added_by   uuid references users(id),
  created_at timestamptz not null default now()
);
create index on tweets (posted_at desc);

-- ============================================================
-- SEED DATA: Hotel Eduard's en La Guaira (confirmed/collapsed)
-- ============================================================
insert into hazard_reports (
  id, category, severity, verification, title, description,
  lat_pub, lng_pub, parroquia, municipio, building_type,
  reporter_id, created_at
) values (
  'b1111111-1111-1111-1111-111111111101',
  'collapsed_building',
  'rojo',
  'official_verified',
  'Hotel Eduard''s — Colapso total',
  'El Hotel Eduard''s en La Guaira sufrió colapso estructural total tras el sismo principal M7.5. Confirmado por equipos de Protección Civil. Área acordonada. Se reportan personas atrapadas. NO ingresar al edificio ni zonas aledañas.',
  10.601,
  -66.932,
  'La Guaira',
  'Vargas',
  'otro',
  'a0000000-0000-0000-0000-000000000001',
  now() - interval '2 hours'
);

insert into incident_precise (report_id, lat, lng) values (
  'b1111111-1111-1111-1111-111111111101',
  10.6012,
  -66.9318
);

-- Seed a few more representative reports across Venezuela for demo
insert into hazard_reports (
  id, category, severity, verification, title, description,
  lat_pub, lng_pub, municipio, reporter_id, created_at
) values
(
  'b1111111-1111-1111-1111-111111111102',
  'damaged_building', 'naranja', 'community_confirmed',
  'Edificio residencial con daño severo',
  'Fachada agrietada y piso inclinado. Familias evacuadas por las autoridades.',
  10.168, -68.001, 'Valencia',
  'a0000000-0000-0000-0000-000000000001',
  now() - interval '90 minutes'
),
(
  'b1111111-1111-1111-1111-111111111103',
  'shelter', null, 'official_verified',
  'Centro de acopio — Escuela Básica Morón',
  'Habilitado como refugio temporal. Capacidad: 200 personas. Hay agua y colchonetas.',
  10.476, -68.196, 'Morón',
  'a0000000-0000-0000-0000-000000000001',
  now() - interval '75 minutes'
),
(
  'b1111111-1111-1111-1111-111111111104',
  'trapped_people', 'rojo', 'community_confirmed',
  'Personas atrapadas — Edificio céntrico',
  'Se escuchan voces bajo los escombros. Solicitar equipo de rescate urgente.',
  10.172, -67.995, 'Valencia',
  'a0000000-0000-0000-0000-000000000001',
  now() - interval '60 minutes'
),
(
  'b1111111-1111-1111-1111-111111111105',
  'water_point', null, 'official_verified',
  'Punto de agua potable — Cruz Roja Venezolana',
  'Distribución de agua en camiones cisterna. Lleva recipientes.',
  10.160, -68.010, 'Valencia',
  'a0000000-0000-0000-0000-000000000001',
  now() - interval '45 minutes'
);

-- Add precise coords for the other seed reports (approximate)
insert into incident_precise (report_id, lat, lng) values
('b1111111-1111-1111-1111-111111111102', 10.1688, -68.0016),
('b1111111-1111-1111-1111-111111111103', 10.4768, -68.1966),
('b1111111-1111-1111-1111-111111111104', 10.1728, -67.9956),
('b1111111-1111-1111-1111-111111111105', 10.1608, -68.0106);

-- ============================================================
-- SEED: Daños reportados por prensa (24-jun-2026). Marcados como
-- community_confirmed con fuente citada — NO confirmados en sitio.
-- Fuentes: El Colombiano, Diario de Morelos, N+, BluRadio, TheObjective.
-- ============================================================
insert into hazard_reports (id, category, severity, verification, title, description, lat_pub, lng_pub, parroquia, municipio, building_type, reporter_id, created_at) values
('b2222222-2222-2222-2222-222222222201','damaged_building','naranja','community_confirmed',
 'Colapso parcial en edificio alto — San Bernardino',
 'Reporte de prensa (El Colombiano, 24-jun-2026 ~22:05 VET): colapso parcial de estructura en edificio alto del sector San Bernardino, Caracas. Pendiente verificación oficial en sitio. No ingresar a estructuras dañadas.',
 10.512, -66.902, 'San Bernardino', 'Caracas', 'apartamento', 'a0000000-0000-0000-0000-000000000001', now() - interval '90 minutes'),
('b2222222-2222-2222-2222-222222222202','damaged_building','amarillo','community_confirmed',
 'Fachadas y escaleras dañadas — Altamira',
 'Reporte de prensa (El Colombiano): fachadas destruidas, grietas en paredes y escaleras desprendidas en edificaciones de Altamira, Chacao (Caracas). Pendiente verificación oficial.',
 10.497, -66.853, 'Altamira', 'Chacao', 'apartamento', 'a0000000-0000-0000-0000-000000000001', now() - interval '70 minutes'),
('b2222222-2222-2222-2222-222222222203','damaged_building','naranja','community_confirmed',
 'Aeropuerto Simón Bolívar (Maiquetía) — daños y vuelos desviados',
 'Reporte de prensa (Diario de Morelos / N+): el Aeropuerto Internacional Simón Bolívar de Maiquetía sufrió afectaciones; vuelos desviados a aeropuertos alternos. Pendiente parte oficial de las autoridades aeronáuticas.',
 10.601, -66.991, 'Maiquetía', 'La Guaira', 'otro', 'a0000000-0000-0000-0000-000000000001', now() - interval '80 minutes'),
('b2222222-2222-2222-2222-222222222204','gas_leak','naranja','official_verified',
 'Corte preventivo de gas directo a edificios',
 'Anuncio oficial (Min. Diosdado Cabello, 24-jun-2026): se ordenó el corte del servicio de gas directo a edificios ante posibles fugas y riesgo de explosión tras el sismo. No enciendas fuego ni equipos eléctricos si hueles gas.',
 10.506, -66.914, 'Libertador', 'Caracas', 'otro', 'a0000000-0000-0000-0000-000000000001', now() - interval '60 minutes');

insert into incident_precise (report_id, lat, lng) values
('b2222222-2222-2222-2222-222222222201', 10.5127, -66.9025),
('b2222222-2222-2222-2222-222222222202', 10.4977, -66.8535),
('b2222222-2222-2222-2222-222222222203', 10.6017, -66.9915),
('b2222222-2222-2222-2222-222222222204', 10.5067, -66.9145);

update hazard_reports set source_url = 'https://www.elcolombiano.com/internacional/temblor-hoy-caracas-venezuela-sismo-bogota-evacuacion-KP38155708'
  where id in ('b2222222-2222-2222-2222-222222222201','b2222222-2222-2222-2222-222222222202');
update hazard_reports set source_url = 'https://www.diariodemorelos.com/noticias/terremoto-magnitud-71-sacude-venezuela-este-miercoles-24-junio-2026-epicentro-cerca-moron-carabobo-danos-en-caracas-alerta-tsunami-cancelada'
  where id in ('b2222222-2222-2222-2222-222222222203','b2222222-2222-2222-2222-222222222204');

-- Reactions on the Eduard's report
insert into report_reaction (report_id, user_id, kind) values
('b1111111-1111-1111-1111-111111111101', 'a0000000-0000-0000-0000-000000000001', 'confirmo');

-- A comment on the Eduard's report
insert into report_comment (report_id, user_id, body) values
('b1111111-1111-1111-1111-111111111101', 'a0000000-0000-0000-0000-000000000001',
 'Protección Civil La Guaira confirmó el colapso. Hay equipos de rescate en camino desde Caracas.');

-- Seed chat message
insert into chat_messages (channel, body, user_id) values
('ops', 'Canal operativo activo. Por favor solo información verificada. 🙏', 'a0000000-0000-0000-0000-000000000001');
