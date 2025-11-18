import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isProtectedPath(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname.startsWith('/_next')) return false;
  if (pathname.startsWith('/api')) return false;
  if (pathname.startsWith('/login')) return false;
  if (pathname.startsWith('/signup')) return false;
  return true;
}

function hasSessionCookie(req: NextRequest): boolean {
  return Boolean(req.cookies.get('__session')?.value);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!hasSessionCookie(req)) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|static|.*\\..*).*)'],
};
