import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Mapa y reportes de daños',
  description: 'Mapa completo y lista filtrable de todos los reportes de daños del terremoto de Venezuela 2026: edificios colapsados y dañados, fugas de gas, vías bloqueadas, refugios y centros de acopio.',
  keywords: ['mapa daños Venezuela', 'reportes terremoto', 'edificios colapsados mapa', 'centros de acopio', 'refugios Venezuela'],
  alternates: { canonical: '/reportes' },
  openGraph: { title: 'Mapa y reportes de daños · SOS Venezuela 2026', description: 'Mapa completo y lista filtrable de todos los reportes de daños.', url: 'https://sosvenezuela2026.com/reportes' },
};

export default function Layout({ children }: { children: ReactNode }) { return children; }
