import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ONBOARDING_COOKIE, SESSION_COOKIE } from '@/lib/auth/constants';

const PUBLIC_PATHS = new Set(['/', '/login']);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/api/internal')) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/favicon')) return true;
  return false;
}

function hasSessionCookie(request: NextRequest): boolean {
  return Boolean(request.cookies.get(SESSION_COOKIE)?.value);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    if (pathname === '/login') {
      if (request.nextUrl.searchParams.get('session') === 'invalid') {
        const response = NextResponse.next();
        response.cookies.delete(SESSION_COOKIE);
        response.cookies.delete(ONBOARDING_COOKIE);
        return response;
      }
      if (hasSessionCookie(request)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    return NextResponse.next();
  }

  if (!hasSessionCookie(request)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
