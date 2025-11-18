import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Only run middleware on protected routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/partner')) {
    const sessionCookie = request.cookies.get('__session');
    
    if (!sessionCookie?.value) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

// Use specific matchers instead of negative lookahead
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/partner/:path*',
  ],
};