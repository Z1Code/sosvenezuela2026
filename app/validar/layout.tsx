import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Validar daño estructural',
  description: 'Residentes suben fotos de estructuras dañadas por el terremoto e ingenieros y arquitectos validan colaborativamente si son habitables o inhabitables y la magnitud del daño.',
  keywords: ['daño estructural Venezuela', 'edificio habitable terremoto', 'evaluación estructural', 'ingenieros voluntarios Venezuela', 'inhabitable terremoto'],
  alternates: { canonical: '/validar' },
  openGraph: { title: 'Validar daño estructural · SOS Venezuela 2026', description: 'Vecinos suben fotos; ingenieros y arquitectos validan si las estructuras son habitables.', url: 'https://sosvenezuela2026.com/validar' },
};

export default function Layout({ children }: { children: ReactNode }) { return children; }
