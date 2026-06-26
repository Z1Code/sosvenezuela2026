import type { NextRequest } from 'next/server';

// Simple in-memory sliding-window limiter (per process / container).
const hits = new Map<string, number[]>();

export function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export function rateLimit(key: string, max = 80, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  // opportunistic cleanup
  if (hits.size > 8000) {
    for (const [k, v] of hits) if (!v.some(t => now - t < windowMs)) hits.delete(k);
  }
  return arr.length <= max;
}
