import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const redirect = req.nextUrl.searchParams.get('redirect') || '/';
  const base = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.get('host')}`;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${base}/api/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    state: encodeURIComponent(redirect),
  });

  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
