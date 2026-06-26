import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://sosvenezuela2026.com';
  const now = new Date();
  const routes: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '/', priority: 1.0, freq: 'hourly' },
    { path: '/buscar', priority: 0.9, freq: 'hourly' },
    { path: '/validar', priority: 0.8, freq: 'daily' },
    { path: '/recomendaciones', priority: 0.8, freq: 'weekly' },
    { path: '/acerca', priority: 0.5, freq: 'monthly' },
    { path: '/privacidad', priority: 0.4, freq: 'monthly' },
    { path: '/login', priority: 0.3, freq: 'monthly' },
    { path: '/register', priority: 0.3, freq: 'monthly' },
  ];
  return routes.map(r => ({
    url: base + r.path,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
