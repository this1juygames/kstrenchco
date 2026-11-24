import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const isAdminRoute = pathname.startsWith('/admin')
  const isPortalRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/onboarding')

  // 1. Block unauthenticated visitors from protected routes
  if ((isAdminRoute || isPortalRoute) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 2. Enforce role-based routing for logged-in users
  if (user && (isAdminRoute || isPortalRoute)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin =
      profile?.role === 'Admin' || profile?.role === 'Internal_Admin'

    if (isAdmin) {
      if (
        pathname === '/admin/dashboard' ||
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/portal')
      ) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/subcontractors'
        return NextResponse.redirect(url)
      }
    } else {
      // Block Sub_Owner / Field_Tech from /admin/*
      if (isAdminRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }

      // Normalize /portal/dashboard -> /dashboard
      if (pathname === '/portal' || pathname === '/portal/dashboard') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/portal/:path*',
    '/onboarding/:path*',
  ],
}