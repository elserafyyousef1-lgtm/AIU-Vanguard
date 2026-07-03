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

  const path = request.nextUrl.pathname

  // ── HYBRID SESSION CHECK (perf fix — measured: getUser() = 240ms–1.5s network round-trip
  //    per authenticated navigation; getSession() reads the cookie locally in ~0ms). ──
  //
  // Routine navigation only needs to know "is there a session?" to route to /login. That is
  // a ROUTING decision, not data protection — every query is still enforced by RLS on the DB
  // with the JWT, so a forged/expired cookie can never read data. For that decision we use
  // getSession() (local). getUser() (server-verified) is kept where it matters:
  //   1. /admin — privileged area gate stays server-validated on every hit.
  //   2. Sessions close to expiry — forces the token refresh that keeps the session alive
  //      (the reason middleware used to call getUser() on every request).
  const { data: { session } } = await supabase.auth.getSession()
  let user = session?.user ?? null

  const nearExpiry = !!session && ((session.expires_at ?? 0) - Math.floor(Date.now() / 1000) < 120)
  if ((user && path.startsWith('/admin')) || nearExpiry) {
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  // Routes that require being logged in
  const protectedPaths = ['/dashboard', '/community', '/settings', '/admin', '/semesters', '/courses', '/messages', '/profile']
  const isProtected = protectedPaths.some(p => path.startsWith(p))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', path)
    return NextResponse.redirect(url)
  }

  // /admin requires owner or admin role (defense layer 1 — RLS is layer 2).
  // Note: user here came from getUser() (server-verified) — see hybrid block above.
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
