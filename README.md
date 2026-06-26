# SOS Venezuela 2026

Plataforma civil y humanitaria creada tras el terremoto del 24 de junio de 2026 en Venezuela (M7.2 / M7.5, costa de Falcón–Carabobo). Centraliza **reportes de daños estructurales**, un **directorio público de personas desaparecidas/encontradas**, **centros de acopio** y coordinación comunitaria, con datos agregados de múltiples plataformas ciudadanas.

En producción: **https://sosvenezuela2026.com**

> Proyecto sin fines de lucro, sin afiliación política. Los datos provienen de carteles públicos y registros comunitarios. Las coordenadas se truncan y los datos sensibles (cédulas, menores, contactos) se enmascaran para proteger a las personas (anti-saqueo / anti-scraping).

## Funcionalidades

- 🗺️ **Mapa en vivo** de sucesos (edificios colapsados/dañados, fugas de gas, vías bloqueadas, personas atrapadas) con SSE.
- 🔎 **Directorio de personas** público con buscador anti-scraping, fotos y aportes de la comunidad.
- 📦 **Centros de acopio** geolocalizados.
- ✅ **Validación** de daños estructurales (vecinos + ingenieros).
- 🔐 Login con **Google OAuth** + panel de administración.
- 📊 Estadísticas de tráfico y reportes.

## Stack

- **Next.js 16** (App Router, Turbopack, output standalone) + TypeScript
- **Tailwind v4**, framer-motion, Leaflet / react-leaflet
- **PostgreSQL** (Neon) vía `pg`
- Despliegue en **Docker** detrás de nginx/haproxy

## Desarrollo local

Requisitos: Node.js 22+, una base de datos PostgreSQL.

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local   # y rellena con tus valores

# 3. Crear el esquema de la base de datos
#    (usa la conexión UNPOOLED; crea tablas, enums, triggers y datos demo)
psql "$DATABASE_URL_UNPOOLED" -f schema.sql

# 4. Levantar el servidor de desarrollo
npm run dev
```

Abre http://localhost:3000.

> El esquema completo está en [`schema.sql`](./schema.sql). Incluye un usuario admin de
> ejemplo (`admin@terremoto.ve` / `admin123`) **solo para desarrollo local** — cámbialo o
> elimínalo en cualquier despliegue real.

### Variables de entorno

Todas las variables están documentadas en [`.env.example`](./.env.example). Los secretos
(`DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAIL`) **solo** se leen del
entorno en el servidor y nunca se exponen al cliente. Únicamente las variables con prefijo
`NEXT_PUBLIC_` llegan al navegador, y ninguna de ellas contiene información sensible.

## Scripts de sincronización de datos

En [`scripts/`](./scripts) hay dos procesos opcionales (pensados para correr por cron) que
alimentan el mapa y el directorio con datos de plataformas ciudadanas:

- `sync.cjs` — importa personas (venezuelatebusca, desaparecidosterremotovenezuela,
  desaparecidosvenezuela), edificios y centros de acopio, con **deduplicación** por
  `ext_id` y firma de identidad. Requiere `DATABASE_URL` y, para algunas fuentes,
  `VTB_KEY` / `TVE_KEY` (ver `.env.example`).
- `newsweep.cjs` — barre Google News, geolocaliza con Ollama local + Nominatim e inserta
  reportes `unverified`. Requiere `DATABASE_URL` (y Ollama corriendo).

```bash
node scripts/sync.cjs
node scripts/newsweep.cjs
```

## Build de producción

```bash
docker build -t sosvenezuela .
docker run -d --env-file .env.prod -p 3000:3000 sosvenezuela
```

## API pública

Los datos son abiertos para fines humanitarios. Endpoints de **solo lectura** con **CORS abierto**
(sin autenticación) — documentación completa en **https://sosvenezuela2026.com/docs**:

| Endpoint | Descripción |
|---|---|
| `GET /api/reports` | Reportes del mapa (daños, acopios) — últimos 500 |
| `GET /api/persons/list` | Directorio de personas (`?q=`, `?estado=`, `?limit=`, `?offset=`) |
| `GET /api/persons/stats` | Cifras agregadas (desaparecidos / encontrados) |
| `GET /api/damage/recent` | Últimos análisis de daño estructural |

Límite ~90 req/min por IP. Cita la fuente como «SOS Venezuela 2026» y respeta la privacidad
(no desanonimices cédulas, coordenadas ni menores). La escritura requiere iniciar sesión.

## Contribuir

¡Las contribuciones son bienvenidas! Lee [CONTRIBUTING.md](./CONTRIBUTING.md) para empezar.

## Seguridad

- Ningún secreto se versiona: `.env*` está en `.gitignore` (excepto la plantilla `.env.example`).
- Si encuentras una vulnerabilidad, por favor repórtala de forma responsable antes de divulgarla.

## Licencia

MIT — ver [LICENSE](./LICENSE).
