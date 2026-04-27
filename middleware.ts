import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/daily',
  '/sessions',
  '/workflows/saved',
  '/account',
  '/settings/setup',
  '/settings/robot',
  '/settings/deploy'
];

function hasSupabaseAuthCookie(req: NextRequest) {
  return req.cookies.getAll().some((cookie) => cookie.name.includes('sb-') && cookie.name.includes('auth-token'));
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const needsAuth = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (!needsAuth) return NextResponse.next();
  if (hasSupabaseAuthCookie(req)) return NextResponse.next();
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', path);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|api/ping|api/health).*)']
};
