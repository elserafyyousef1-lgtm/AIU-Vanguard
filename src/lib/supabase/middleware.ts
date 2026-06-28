// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — MUST call getUser() to keep session alive.
  // [diag] measure getUser() latency server-side → Vercel runtime logs. MEASUREMENT ONLY:
  // identical call + identical result; the wrapper changes no behavior. Remove after diagnosis.
  const __t0 = performance.now()
  const { data: { user } } = await supabase.auth.getUser()
  const __ms = Math.round(performance.now() - __t0)
  console.log(`[mw-timing] getUser=${__ms}ms path=${request.nextUrl.pathname} prefetch=${request.headers.get('next-router-prefetch') ?? '0'} auth=${user ? '1' : '0'}`)

  const path = request.nextUrl.pathname

  // Routes that require being logged in
  const protectedPaths = ['/dashboard', '/community', '/settings', '/admin', '/semesters', '/courses', '/messages', '/profile']
  const isProtected = protectedPaths.some(p => path.startsWith(p))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', path)
    return NextResponse.redirect(url)
  }

  // /admin requires owner or admin role (defense layer 1 — RLS is layer 2)
  if (user && path.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
