--
-- PostgreSQL database dump
--

\restrict Qo9Vnrtnbt1IBtcZlqzlLxzAZFVpKRf8mP3wKaFrwF156WkJV6dhlZAGwc56MGN

-- Dumped from database version 18.4 (eaf151e)
-- Dumped by pg_dump version 18.4 (Debian 18.4-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: building_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.building_type AS ENUM (
    'casa',
    'apartamento',
    'hospital',
    'escuela',
    'otro'
);


--
-- Name: cedula_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cedula_type AS ENUM (
    'V',
    'E'
);


--
-- Name: person_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.person_status AS ENUM (
    'seeking_info',
    'self_safe',
    'found_alive',
    'injured',
    'hospitalized',
    'sheltered',
    'deceased',
    'unknown'
);


--
-- Name: report_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.report_category AS ENUM (
    'collapsed_building',
    'damaged_building',
    'trapped_people',
    'fire',
    'gas_leak',
    'blocked_road',
    'flooding',
    'medical_need',
    'shelter',
    'water_point',
    'aid_point'
);


--
-- Name: resource_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.resource_status AS ENUM (
    'open',
    'full',
    'closed'
);


--
-- Name: severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.severity AS ENUM (
    'verde',
    'amarillo',
    'naranja',
    'rojo'
);


--
-- Name: triage_inside; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.triage_inside AS ENUM (
    'si',
    'no',
    'desconocido'
);


--
-- Name: triage_occupancy; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.triage_occupancy AS ENUM (
    'ocupado',
    'vacante',
    'desconocido'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'citizen',
    'responder',
    'admin'
);


--
-- Name: verification; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.verification AS ENUM (
    'unverified',
    'community_confirmed',
    'official_verified',
    'resolved',
    'false_report'
);


--
-- Name: create_hazard_report(uuid, public.report_category, public.severity, public.resource_status, text, text, double precision, double precision, text, text, integer, boolean, public.triage_inside, public.triage_occupancy, public.building_type); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_hazard_report(p_reporter_id uuid, p_category public.report_category, p_severity public.severity, p_resource_status public.resource_status, p_title text, p_description text, p_lat double precision, p_lng double precision, p_parroquia text, p_municipio text, p_trapped integer, p_trapped_unknown boolean, p_inside public.triage_inside, p_occupancy public.triage_occupancy, p_building public.building_type) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: match_watch(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_watch() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: prep_person_report(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prep_person_report() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.cedula_norm := nullif(upper(regexp_replace(coalesce(new.cedula,''), '[^0-9A-Za-z]', '', 'g')), '');
  new.phone_norm  := nullif(regexp_replace(coalesce(new.phone,''), '[^0-9+]', '', 'g'), '');
  return new;
end $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: person_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.person_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    status public.person_status NOT NULL,
    cedula text,
    cedula_norm text,
    cedula_type public.cedula_type,
    given_name text,
    family_name text,
    full_name text NOT NULL,
    is_minor boolean DEFAULT false NOT NULL,
    sex text,
    age_min integer,
    age_max integer,
    phone text,
    phone_norm text,
    municipio text,
    parroquia text,
    hospital_name text,
    note_text text,
    is_self_report boolean DEFAULT false NOT NULL,
    photo_path text,
    reporter_id uuid NOT NULL,
    reporter_contact text,
    flagged_count integer DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    source_date timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expiry_date timestamp with time zone DEFAULT (now() + '90 days'::interval) NOT NULL,
    ext_id text
);


--
-- Name: person_public; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.person_public AS
 SELECT id,
    status,
        CASE
            WHEN (cedula_norm IS NOT NULL) THEN ((COALESCE((cedula_type)::text, ''::text) || '-****'::text) || "right"(cedula_norm, 3))
            ELSE NULL::text
        END AS cedula_masked,
        CASE
            WHEN is_minor THEN 'Menor reportado'::text
            ELSE TRIM(BOTH FROM ((COALESCE(given_name, ''::text) || ' '::text) ||
            CASE
                WHEN (family_name IS NOT NULL) THEN ("left"(family_name, 1) || '.'::text)
                ELSE ''::text
            END))
        END AS display_name,
    municipio,
    parroquia,
    hospital_name,
    source_date,
    photo_path
   FROM public.person_reports
  WHERE ((deleted_at IS NULL) AND (status <> 'deceased'::public.person_status));


--
-- Name: search_person(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_person(p_cedula text, p_phone text, p_name text) RETURNS SETOF public.person_public
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel text DEFAULT 'ops'::text NOT NULL,
    estado text,
    body text NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: damage_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.damage_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zona text,
    municipio text,
    building_type text,
    note text,
    photo_ids text[] DEFAULT '{}'::text[] NOT NULL,
    submitter_id uuid,
    habitable_votes integer DEFAULT 0 NOT NULL,
    inhabitable_votes integer DEFAULT 0 NOT NULL,
    uncertain_votes integer DEFAULT 0 NOT NULL,
    validations integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: damage_validations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.damage_validations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    validator_id uuid,
    habitabilidad text NOT NULL,
    severidad text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT damage_validations_habitabilidad_check CHECK ((habitabilidad = ANY (ARRAY['habitable'::text, 'inhabitable'::text, 'incierto'::text]))),
    CONSTRAINT damage_validations_severidad_check CHECK ((severidad = ANY (ARRAY['leve'::text, 'moderado'::text, 'severo'::text, 'colapso'::text])))
);


--
-- Name: emergency_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergency_status (
    key text NOT NULL,
    value text NOT NULL,
    label text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: hazard_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hazard_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category public.report_category NOT NULL,
    severity public.severity,
    resource_status public.resource_status,
    verification public.verification DEFAULT 'unverified'::public.verification NOT NULL,
    title text,
    description text,
    lat_pub double precision NOT NULL,
    lng_pub double precision NOT NULL,
    parroquia text,
    municipio text,
    people_trapped_count integer,
    people_trapped_unknown boolean DEFAULT false NOT NULL,
    anyone_inside public.triage_inside,
    occupancy public.triage_occupancy,
    building_type public.building_type,
    confirms integer DEFAULT 0 NOT NULL,
    disputes integer DEFAULT 0 NOT NULL,
    reporter_id uuid NOT NULL,
    flagged_count integer DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source_url text,
    image_url text,
    site_vs30 integer,
    site_class text,
    ext_id text
);


--
-- Name: incident_precise; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incident_precise (
    report_id uuid NOT NULL,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: moderacion_intentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderacion_intentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    canal text,
    contenido_raw text,
    categorias text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: news_articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.news_articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    source text,
    summary text,
    image_url text,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: news_seen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.news_seen (
    url text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    watcher_id uuid NOT NULL,
    person_report_id uuid NOT NULL,
    cedula_norm text NOT NULL,
    status public.person_status NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: page_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.page_views (
    id bigint NOT NULL,
    path text NOT NULL,
    visitor text,
    referrer text,
    device text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: page_views_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.page_views_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: page_views_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.page_views_id_seq OWNED BY public.page_views.id;


--
-- Name: person_tips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.person_tips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    person_report_id uuid NOT NULL,
    body text NOT NULL,
    contact text,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: report_comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_comment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    user_id uuid NOT NULL,
    body text NOT NULL,
    hidden boolean DEFAULT false NOT NULL,
    flagged_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: report_reaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_reaction (
    report_id uuid NOT NULL,
    user_id uuid NOT NULL,
    kind text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT report_reaction_kind_check CHECK ((kind = ANY (ARRAY['confirmo'::text, 'sigue'::text, 'resuelto'::text, 'disputo'::text])))
);


--
-- Name: safe_checkin; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.safe_checkin (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    estado text,
    msg text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tweets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tweets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tweet_id text NOT NULL,
    url text NOT NULL,
    posted_at timestamp with time zone NOT NULL,
    added_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    full_name text,
    phone text,
    role public.user_role DEFAULT 'citizen'::public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: watch_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.watch_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    watcher_id uuid NOT NULL,
    cedula_norm text NOT NULL,
    label text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: page_views id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_views ALTER COLUMN id SET DEFAULT nextval('public.page_views_id_seq'::regclass);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: damage_submissions damage_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.damage_submissions
    ADD CONSTRAINT damage_submissions_pkey PRIMARY KEY (id);


--
-- Name: damage_validations damage_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.damage_validations
    ADD CONSTRAINT damage_validations_pkey PRIMARY KEY (id);


--
-- Name: damage_validations damage_validations_submission_id_validator_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.damage_validations
    ADD CONSTRAINT damage_validations_submission_id_validator_id_key UNIQUE (submission_id, validator_id);


--
-- Name: emergency_status emergency_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_status
    ADD CONSTRAINT emergency_status_pkey PRIMARY KEY (key);


--
-- Name: hazard_reports hazard_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hazard_reports
    ADD CONSTRAINT hazard_reports_pkey PRIMARY KEY (id);


--
-- Name: incident_precise incident_precise_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_precise
    ADD CONSTRAINT incident_precise_pkey PRIMARY KEY (report_id);


--
-- Name: moderacion_intentos moderacion_intentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderacion_intentos
    ADD CONSTRAINT moderacion_intentos_pkey PRIMARY KEY (id);


--
-- Name: news_articles news_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news_articles
    ADD CONSTRAINT news_articles_pkey PRIMARY KEY (id);


--
-- Name: news_articles news_articles_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news_articles
    ADD CONSTRAINT news_articles_url_key UNIQUE (url);


--
-- Name: news_seen news_seen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news_seen
    ADD CONSTRAINT news_seen_pkey PRIMARY KEY (url);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: page_views page_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_views
    ADD CONSTRAINT page_views_pkey PRIMARY KEY (id);


--
-- Name: person_reports person_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_reports
    ADD CONSTRAINT person_reports_pkey PRIMARY KEY (id);


--
-- Name: person_tips person_tips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_tips
    ADD CONSTRAINT person_tips_pkey PRIMARY KEY (id);


--
-- Name: report_comment report_comment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_comment
    ADD CONSTRAINT report_comment_pkey PRIMARY KEY (id);


--
-- Name: report_reaction report_reaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_reaction
    ADD CONSTRAINT report_reaction_pkey PRIMARY KEY (report_id, user_id, kind);


--
-- Name: safe_checkin safe_checkin_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.safe_checkin
    ADD CONSTRAINT safe_checkin_pkey PRIMARY KEY (id);


--
-- Name: tweets tweets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tweets
    ADD CONSTRAINT tweets_pkey PRIMARY KEY (id);


--
-- Name: tweets tweets_tweet_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tweets
    ADD CONSTRAINT tweets_tweet_id_key UNIQUE (tweet_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: watch_subscriptions watch_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_subscriptions
    ADD CONSTRAINT watch_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: chat_messages_channel_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chat_messages_channel_created_at_idx ON public.chat_messages USING btree (channel, created_at);


--
-- Name: ds_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ds_created ON public.damage_submissions USING btree (validations, created_at DESC);


--
-- Name: hazard_reports_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hazard_reports_created_at_idx ON public.hazard_reports USING btree (created_at);


--
-- Name: idx_news_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_news_published ON public.news_articles USING btree (published_at DESC NULLS LAST);


--
-- Name: moderacion_intentos_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX moderacion_intentos_user_id_created_at_idx ON public.moderacion_intentos USING btree (user_id, created_at);


--
-- Name: notifications_watcher_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_watcher_id_created_at_idx ON public.notifications USING btree (watcher_id, created_at);


--
-- Name: person_reports_cedula_norm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX person_reports_cedula_norm_idx ON public.person_reports USING btree (cedula_norm);


--
-- Name: person_reports_phone_norm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX person_reports_phone_norm_idx ON public.person_reports USING btree (phone_norm);


--
-- Name: person_tips_pid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX person_tips_pid ON public.person_tips USING btree (person_report_id, created_at);


--
-- Name: pr_ext_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pr_ext_id ON public.person_reports USING btree (ext_id);


--
-- Name: pv_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pv_created ON public.page_views USING btree (created_at);


--
-- Name: pv_visitor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pv_visitor ON public.page_views USING btree (visitor);


--
-- Name: report_comment_report_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX report_comment_report_id_created_at_idx ON public.report_comment USING btree (report_id, created_at);


--
-- Name: safe_checkin_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX safe_checkin_created_at_idx ON public.safe_checkin USING btree (created_at);


--
-- Name: tweets_posted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tweets_posted_idx ON public.tweets USING btree (posted_at DESC);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: ux_hazard_ext; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_hazard_ext ON public.hazard_reports USING btree (ext_id);


--
-- Name: watch_subscriptions_cedula_norm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX watch_subscriptions_cedula_norm_idx ON public.watch_subscriptions USING btree (cedula_norm);


--
-- Name: person_reports trg_match; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_match AFTER INSERT ON public.person_reports FOR EACH ROW EXECUTE FUNCTION public.match_watch();


--
-- Name: person_reports trg_prep_person; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prep_person BEFORE INSERT ON public.person_reports FOR EACH ROW EXECUTE FUNCTION public.prep_person_report();


--
-- Name: chat_messages chat_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: damage_submissions damage_submissions_submitter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.damage_submissions
    ADD CONSTRAINT damage_submissions_submitter_id_fkey FOREIGN KEY (submitter_id) REFERENCES public.users(id);


--
-- Name: damage_validations damage_validations_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.damage_validations
    ADD CONSTRAINT damage_validations_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.damage_submissions(id) ON DELETE CASCADE;


--
-- Name: damage_validations damage_validations_validator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.damage_validations
    ADD CONSTRAINT damage_validations_validator_id_fkey FOREIGN KEY (validator_id) REFERENCES public.users(id);


--
-- Name: hazard_reports hazard_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hazard_reports
    ADD CONSTRAINT hazard_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id);


--
-- Name: incident_precise incident_precise_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_precise
    ADD CONSTRAINT incident_precise_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.hazard_reports(id) ON DELETE CASCADE;


--
-- Name: moderacion_intentos moderacion_intentos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderacion_intentos
    ADD CONSTRAINT moderacion_intentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_person_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_person_report_id_fkey FOREIGN KEY (person_report_id) REFERENCES public.person_reports(id);


--
-- Name: notifications notifications_watcher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_watcher_id_fkey FOREIGN KEY (watcher_id) REFERENCES public.users(id);


--
-- Name: person_reports person_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_reports
    ADD CONSTRAINT person_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id);


--
-- Name: person_tips person_tips_person_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_tips
    ADD CONSTRAINT person_tips_person_report_id_fkey FOREIGN KEY (person_report_id) REFERENCES public.person_reports(id) ON DELETE CASCADE;


--
-- Name: person_tips person_tips_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_tips
    ADD CONSTRAINT person_tips_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: report_comment report_comment_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_comment
    ADD CONSTRAINT report_comment_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.hazard_reports(id) ON DELETE CASCADE;


--
-- Name: report_comment report_comment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_comment
    ADD CONSTRAINT report_comment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: report_reaction report_reaction_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_reaction
    ADD CONSTRAINT report_reaction_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.hazard_reports(id) ON DELETE CASCADE;


--
-- Name: report_reaction report_reaction_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_reaction
    ADD CONSTRAINT report_reaction_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: safe_checkin safe_checkin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.safe_checkin
    ADD CONSTRAINT safe_checkin_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: tweets tweets_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tweets
    ADD CONSTRAINT tweets_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id);


--
-- Name: watch_subscriptions watch_subscriptions_watcher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_subscriptions
    ADD CONSTRAINT watch_subscriptions_watcher_id_fkey FOREIGN KEY (watcher_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict Qo9Vnrtnbt1IBtcZlqzlLxzAZFVpKRf8mP3wKaFrwF156WkJV6dhlZAGwc56MGN


-- ============================================================
-- Seed mínimo para DESARROLLO LOCAL (no forma parte de producción).
-- Usuario admin de ejemplo para poder entrar a /admin en local.
-- password: "admin123"  → CÁMBIALO o elimínalo en cualquier despliegue real.
-- ============================================================
INSERT INTO public.users (id, email, password_hash, full_name, role) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@terremoto.ve',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LkZkSGxUXJG',
  'Administrador',
  'admin'
) ON CONFLICT (id) DO NOTHING;
