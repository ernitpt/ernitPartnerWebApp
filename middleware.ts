import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isProtectedPath, hasSessionCookie } from '@/features/auth/guards';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // Minimal protection based on Firebase '__session' cookie
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


