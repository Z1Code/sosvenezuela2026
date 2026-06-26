import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from './lib/auth';

// Pages that require login (/buscar is public — anti-scraping handled in the API)
const PROTECTED = ['/reportar', '/reportar-persona', '/chat', '/notificaciones', '/admin'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
