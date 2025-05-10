import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Admin authorization check using direct profile query
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("[API /api/admin/add-product-columns POST] Error getting session:", sessionError.message)
      return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 })
    }

    if (!session) {
      console.log("[API /api/admin/add-product-columns POST] No session found on the server.")
      return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 })
    }

    console.log(`[API /api/admin/add-product-columns POST] Session User ID: ${session.user.id}. Fetching profile for role check.`)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error(`[API /api/admin/add-product-columns POST] Error fetching profile for user ${session.user.id}:`, profileError.message)
      return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 })
    }

    if (!profile) {
      console.warn(`[API /api/admin/add-product-columns POST] Profile not found for user ${session.user.id}. Authorization denied.`)
      return NextResponse.json({ error: "Unauthorized: User profile not found." }, { status: 403 })
    }

    const userRoleFromProfile = profile.role
    console.log(`[API /api/admin/add-product-columns POST] User role from profile: ${userRoleFromProfile}`)

    if (userRoleFromProfile !== 'admin') {
      console.warn(`[API /api/admin/add-product-columns POST] Authorization failed. User role: ${userRoleFromProfile} (Expected 'admin')`)
      return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 })
    }
    // End of admin authorization check
    console.log(`[API /api/admin/add-product-columns POST] Authorization successful for admin user: ${session.user.id}`)

    // Add approval-related columns to products table
    const { error } = await supabase.rpc("add_product_approval_columns")

    if (error) {
      console.error("Error adding product columns:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in add-product-columns route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
