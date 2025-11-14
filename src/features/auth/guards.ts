import type { NextRequest } from 'next/server';

export function isProtectedPath(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname.startsWith('/_next')) return false;
  if (pathname.startsWith('/api')) return false;
  if (pathname.startsWith('/login')) return false;
  if (pathname.startsWith('/signup')) return false;
  return true;
}

export function hasSessionCookie(req: NextRequest): boolean {
  return Boolean(req.cookies.get('__session')?.value);
}


