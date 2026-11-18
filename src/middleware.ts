import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const ROLE_ROUTE_PREFIXES: Record<string, string> = {
  super_admin: '/admin',
  admin: '/admin',
  manager: '/manager',
  teacher: '/teacher',
  student: '/student',
  parent: '/parent',
};

/**
 * Hardened Supabase Auth & Role-Based Access Middleware
 * SECURITY RULE:
 * 1. Never trust client-controlled cookies, localStorage, or headers for roles.
 * 2. Always verify session via supabase.auth.getUser() cryptographically.
 * 3. Look up real verified role and active status in public.profiles.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass static assets, internal routes, and public login / reset pages
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login' ||
    pathname === '/forgot-password'
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project-id') || supabaseUrl.includes('educenter-demo.supabase.co') || supabaseKey.includes('placeholder')) {
    // If Supabase is not configured yet, let public pages through or redirect to login with notice
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login?error=env_unconfigured', request.url));
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // 1. Verify authenticated user token with Supabase Auth server
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Query server-side profile table for verified role and active status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    return NextResponse.redirect(new URL('/login?error=account_inactive', request.url));
  }

  const verifiedRole = (profile.role as string) || 'student';

  // If visiting the root '/', automatically redirect to the user's role-based dashboard
  if (pathname === '/') {
    const targetDashboard = ROLE_ROUTE_PREFIXES[verifiedRole] || '/student';
    return NextResponse.redirect(new URL(targetDashboard, request.url));
  }

  // 3. Enforce strict route isolation per verified database role
  const isSuperOrAdmin = verifiedRole === 'super_admin' || verifiedRole === 'admin';
  const isStaff = isSuperOrAdmin || verifiedRole === 'manager';

  if (pathname.startsWith('/admin') && !isSuperOrAdmin) {
    const targetDashboard = ROLE_ROUTE_PREFIXES[verifiedRole] || '/student';
    return NextResponse.redirect(new URL(targetDashboard, request.url));
  }

  if (pathname.startsWith('/manager') && !isStaff) {
    const targetDashboard = ROLE_ROUTE_PREFIXES[verifiedRole] || '/student';
    return NextResponse.redirect(new URL(targetDashboard, request.url));
  }

  if (pathname.startsWith('/teacher') && verifiedRole !== 'teacher' && !isSuperOrAdmin) {
    const targetDashboard = ROLE_ROUTE_PREFIXES[verifiedRole] || '/login';
    return NextResponse.redirect(new URL(targetDashboard, request.url));
  }

  if (pathname.startsWith('/student') && verifiedRole !== 'student' && !isSuperOrAdmin) {
    const targetDashboard = ROLE_ROUTE_PREFIXES[verifiedRole] || '/login';
    return NextResponse.redirect(new URL(targetDashboard, request.url));
  }

  if (pathname.startsWith('/parent') && verifiedRole !== 'parent' && !isSuperOrAdmin) {
    const targetDashboard = ROLE_ROUTE_PREFIXES[verifiedRole] || '/login';
    return NextResponse.redirect(new URL(targetDashboard, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/', '/admin/:path*', '/manager/:path*', '/teacher/:path*', '/student/:path*', '/parent/:path*'],
};
