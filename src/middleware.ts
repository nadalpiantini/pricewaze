import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { validateInvitationTokenServer, INVITATIONS_ENABLED } from '@/lib/invitations';

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/properties',
  '/offers',
  '/visits',
  '/favorites',
  '/comparison',
  '/notifications',
  '/market-alerts',
  '/alerts',
  '/messages',
  '/settings',
  '/onboarding',
];

// Routes that should redirect to home if already authenticated
const authRoutes = ['/login', '/register', '/forgot-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create a response to modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if it exists
  const { data: { user } } = await supabase.auth.getUser();

  // L2: Check invitation for soft launch (only if not authenticated and invitations enabled)
  if (!user && INVITATIONS_ENABLED) {
    const inviteToken = 
      request.nextUrl.searchParams.get('invite') || 
      request.nextUrl.searchParams.get('token') ||
      request.cookies.get('pricewaze_invitation_token')?.value;

    if (inviteToken) {
      // Validate token
      if (validateInvitationTokenServer(inviteToken)) {
        // Store token in cookie for later use
        response.cookies.set('pricewaze_invitation_token', inviteToken, {
          httpOnly: false,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
      } else {
        // Invalid token
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'invalid_invitation');
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    } else {
      // No token provided
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'invitation_required');
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if route is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to home if accessing auth routes while logged in
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt (static files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|.*\\..*$).*)',
  ],
};
