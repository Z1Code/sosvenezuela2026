import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Buscar persona desaparecida',
  description: 'Directorio público de personas reportadas como desaparecidas o encontradas tras el terremoto de Venezuela del 24 de junio de 2026. Busca por nombre, explora la lista con fotos y aporta información.',
  keywords: ['buscar desaparecidos Venezuela', 'personas desaparecidas terremoto', 'encontrar familiar Venezuela', 'desaparecidos La Guaira', 'desaparecidos Caracas'],
  alternates: { canonical: '/buscar' },
  openGraph: { title: 'Buscar persona desaparecida · SOS Venezuela 2026', description: 'Directorio público de personas desaparecidas y encontradas tras el terremoto. Busca por nombre.', url: 'https://sosvenezuela2026.com/buscar' },
};

export default function Layout({ children }: { children: ReactNode }) { return children; }
