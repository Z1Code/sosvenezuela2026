-- ============================================================
-- Búsqueda difusa de personas (tolerante a acentos, orden y tipeo)
-- Usa pg_trgm + unaccent sobre person_reports.full_name.
-- Aplicar con conexión UNPOOLED.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() es STABLE (depende del search_path); para poder indexarla
-- envolvemos la forma de 2 args, que sí es IMMUTABLE.
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

-- Índice GIN de trigramas sobre el nombre real, sin acentos.
-- (CONCURRENTLY: no bloquea las escrituras del cron horario.)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preports_fullname_trgm
ON public.person_reports
USING gin (public.f_unaccent(full_name) gin_trgm_ops);
