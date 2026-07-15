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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protected route groups
  const isAdminRoute    = request.nextUrl.pathname.startsWith('/admin')
  const isTraineeRoute  = request.nextUrl.pathname.startsWith('/trainee')
  const isOrgRoute      = request.nextUrl.pathname.startsWith('/org')
  const isAuthRoute     = request.nextUrl.pathname.startsWith('/auth')

  if (!user && (isAdminRoute || isTraineeRoute || isOrgRoute)) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return supabaseResponse
}
