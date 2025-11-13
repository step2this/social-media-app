import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  const { pathname } = request.nextUrl;

  // Log all requests in development (JSON format)
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      JSON.stringify({
        level: 'info',
        time: Date.now(),
        app: 'social-media-web',
        type: 'request',
        method: request.method,
        pathname,
        hasAuth: !!token,
        msg: `${request.method} ${pathname}`,
      })
    );
  }

  // Public routes
  const isPublicRoute =
    pathname.startsWith('/login') || pathname.startsWith('/register') || pathname === '/';

  // If no token and trying to access protected route
  if (!token && !isPublicRoute) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        JSON.stringify({
          level: 'warn',
          time: Date.now(),
          app: 'social-media-web',
          type: 'auth',
          pathname,
          msg: 'Redirecting to login - no auth token',
        })
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If has token and trying to access auth pages
  if (token && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
