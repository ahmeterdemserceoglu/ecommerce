import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Check if the path is a product or store URL with a numeric ID instead of a slug
  const url = req.nextUrl.clone()
  const path = url.pathname

  // Handle direct numeric IDs in URLs by redirecting to the ID handler
  if (path.match(/^\/urun\/\d+$/)) {
    const id = path.split("/").pop()
    url.pathname = `/urun/id/${id}`
    return NextResponse.redirect(url)
  }

  if (path.match(/^\/magaza\/\d+$/)) {
    const id = path.split("/").pop()
    url.pathname = `/magaza/id/${id}`
    return NextResponse.redirect(url)
  }

  // Handle authentication for protected routes
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protected routes that require authentication
  const protectedRoutes = ["/hesabim", "/hesabim/siparislerim", "/sepet/odeme", "/seller", "/admin"]

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route) || path === route)

  // If it's a protected route and user is not authenticated, redirect to login
  if (isProtectedRoute && !session) {
    url.pathname = "/giris"
    url.searchParams.set("returnTo", path)
    return NextResponse.redirect(url)
  }

  return res
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
