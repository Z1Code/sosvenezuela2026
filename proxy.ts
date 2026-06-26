import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from './lib/auth';

// Pages that require login (/buscar is public — anti-scraping handled in the API)
const PROTECTED = ['/reportar', '/reportar-persona', '/chat', '/notificaciones', '/admin'];

// API pública de SOLO LECTURA: CORS abierto para que terceros consuman los datos
// humanitarios (mapas, bots, dashboards). La escritura sigue requiriendo login.
const PUBLIC_API = ['/api/reports', '/api/persons/list', '/api/persons/stats', '/api/damage/recent'];
const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_API.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    if (req.method === 'OPTIONS') return new NextResponse(null, { status: 204, headers: CORS });
    const res = NextResponse.next();
    Object.entries(CORS).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  if (pathname.startsWith('/api/') || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  const needsAuth = PROTECTED.some(p => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  const user = getUserFromRequest(req);
  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
