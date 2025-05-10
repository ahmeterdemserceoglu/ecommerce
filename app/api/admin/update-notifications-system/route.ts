import { NextResponse, NextRequest } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  const cookieStore = cookies()
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })

  // Admin authorization check
  const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession()
  if (sessionError) {
    console.error("[API /api/admin/update-notifications-system POST] Error getting session:", sessionError.message)
    return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 })
  }
  if (!session) {
    console.log("[API /api/admin/update-notifications-system POST] No session found.")
    return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 })
  }
  const { data: userProfile, error: profileError } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (profileError) {
    console.error(`[API /api/admin/update-notifications-system POST] Error fetching profile for user ${session.user.id}:`, profileError.message)
    return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 })
  }
  if (!userProfile || userProfile.role !== 'admin') {
    console.warn(`[API /api/admin/update-notifications-system POST] Authorization failed. User role: ${userProfile?.role} (Expected 'admin')`)
    return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 })
  }
  console.log(`[API /api/admin/update-notifications-system POST] Admin user ${session.user.id} authorized.`)
  // End admin authorization check

  try {
    // Bildirim sistemini kurmak için SQL komutlarını çalıştır
    // The fetch call needs to pass along the admin's session/cookie for the target endpoint to authorize.
    // This is tricky if the target endpoint also relies on httpOnly cookies for auth.
    // For simplicity, we assume the target endpoint will re-authenticate based on cookies passed by the browser context
    // if this API route is called from a client-side admin panel. 
    // If called server-to-server, a more robust auth forwarding mechanism (e.g. service key for internal calls if appropriate)
    // or direct function call would be better.
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
    const response = await fetch(`${baseUrl}/api/admin/setup-notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forwarding cookies like this can be complex and have security implications.
        // If 'setup-notifications' is an internal admin setup, it might be better invoked directly
        // or secured by a service role key if it's meant for system setup rather than user-triggered admin actions.
        // For now, relying on the browser's cookie forwarding if this endpoint is hit from client.
        // If 'request' is available and has headers, one might try to forward 'cookie' header, but it's not straightforward with Next.js Route Handlers for httpOnly cookies.
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.error || "Bildirim sistemi kurulurken hata oluştu" },
        { status: response.status },
      )
    }

    return NextResponse.json({ message: "Bildirim sistemi başarıyla güncellendi" }, { status: 200 })
  } catch (error: any) {
    console.error("Bildirim sistemi güncellenirken beklenmeyen hata:", error)
    return NextResponse.json({ error: "Bildirim sistemi güncellenirken beklenmeyen bir hata oluştu" }, { status: 500 })
  }
}
