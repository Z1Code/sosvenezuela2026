import './globals.css';
import type { Metadata, Viewport } from 'next';
import { SseProvider } from './sse-provider';
import Track from './track';
import type { ReactNode } from 'react';

const SITE = 'https://sosvenezuela2026.com';
const DESC = 'Mapa colaborativo en tiempo real del terremoto M7.5 en Venezuela (24 jun 2026): reportes de daños y colapsos, búsqueda de personas desaparecidas, refugios, primeros auxilios y canal comunitario. Tu ubicación exacta nunca se comparte públicamente.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'SOS Venezuela 2026 — Mapa en vivo del terremoto',
    template: '%s · SOS Venezuela 2026',
  },
  description: DESC,
  applicationName: 'SOS Venezuela 2026',
  authors: [{ name: 'SOS Venezuela 2026' }],
  generator: 'Next.js',
  keywords: [
    'terremoto Venezuela', 'sismo Venezuela 2026', 'terremoto 24 junio 2026', 'terremoto Caracas',
    'terremoto Morón', 'Puerto Cabello sismo', 'La Guaira terremoto', 'mapa terremoto en vivo',
    'personas desaparecidas Venezuela', 'refugios Venezuela', 'primeros auxilios sismo',
    'edificios colapsados', 'SOS Venezuela', 'ayuda terremoto Venezuela', 'réplicas Venezuela',
  ],
  category: 'news',
  alternates: { canonical: '/' },
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  openGraph: {
    type: 'website', locale: 'es_VE', url: SITE, siteName: 'SOS Venezuela 2026',
    title: 'SOS Venezuela 2026 — Mapa en vivo del terremoto',
    description: DESC,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SOS Venezuela 2026 — Mapa en vivo del terremoto',
    description: DESC,
  },
  appleWebApp: { capable: true, title: 'SOS Venezuela 2026', statusBarStyle: 'default' },
  formatDetection: { telephone: true },
  other: { 'llms-txt': `${SITE}/llms.txt` },
};

// Structured data for search engines + LLMs.
const JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite', '@id': `${SITE}/#website`, url: SITE, name: 'SOS Venezuela 2026',
      description: DESC, inLanguage: 'es-VE',
      potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/buscar?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
    },
    {
      '@type': 'Organization', '@id': `${SITE}/#org`, name: 'SOS Venezuela 2026', url: SITE,
      logo: `${SITE}/icon.svg`, description: 'Plataforma cívica humanitaria de respuesta al terremoto de Venezuela 2026.',
    },
    {
      '@type': 'SpecialAnnouncement', name: 'Terremoto M7.5 — Venezuela, 24 de junio de 2026',
      text: DESC, datePosted: '2026-06-24', category: 'https://www.wikidata.org/wiki/Q7944',
      url: SITE, announcementLocation: { '@type': 'Country', name: 'Venezuela' },
      spatialCoverage: { '@type': 'Country', name: 'Venezuela' },
    },
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0D9488',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <SseProvider>{children}</SseProvider>
        <Track />
      </body>
    </html>
  );
}
