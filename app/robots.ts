import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const aiBots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'anthropic-ai', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'cohere-ai', 'Bytespider'];
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/notificaciones'] },
      // Welcome AI/LLM crawlers explicitly so the platform is discoverable by assistants.
      ...aiBots.map(b => ({ userAgent: b, allow: '/', disallow: ['/admin', '/api/'] })),
    ],
    sitemap: 'https://sosvenezuela2026.com/sitemap.xml',
    host: 'https://sosvenezuela2026.com',
  };
}
