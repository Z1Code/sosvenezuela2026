import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';

export async function GET() {
  const user = await getUserFromCookie();
  return NextResponse.json({ user: user ? { email: user.email, role: user.role } : null });
}
