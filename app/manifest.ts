import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SOS Venezuela 2026 — Mapa en vivo del terremoto',
    short_name: 'SOS VE 2026',
    description: 'Mapa colaborativo en tiempo real del terremoto en Venezuela: reportes, personas, refugios y primeros auxilios.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F9FC',
    theme_color: '#0D9488',
    lang: 'es',
    categories: ['news', 'health', 'utilities'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
