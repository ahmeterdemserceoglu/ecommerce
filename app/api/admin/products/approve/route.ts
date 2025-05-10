import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { productId } = await request.json()

    // Admin authorization check using direct profile query
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("[API /api/admin/products/approve POST] Error getting session:", sessionError.message)
      return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 })
    }

    if (!session) {
      console.log("[API /api/admin/products/approve POST] No session found on the server.")
      return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 })
    }

    console.log(`[API /api/admin/products/approve POST] Session User ID: ${session.user.id}. Fetching profile for role check.`)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error(`[API /api/admin/products/approve POST] Error fetching profile for user ${session.user.id}:`, profileError.message)
      return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 })
    }

    if (!profile) {
      console.warn(`[API /api/admin/products/approve POST] Profile not found for user ${session.user.id}. Authorization denied.`)
      return NextResponse.json({ error: "Unauthorized: User profile not found." }, { status: 403 })
    }

    const userRoleFromProfile = profile.role
    console.log(`[API /api/admin/products/approve POST] User role from profile: ${userRoleFromProfile}`)

    if (userRoleFromProfile !== 'admin') {
      console.warn(`[API /api/admin/products/approve POST] Authorization failed. User role: ${userRoleFromProfile} (Expected 'admin')`)
      return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 })
    }
    // End of admin authorization check
    console.log(`[API /api/admin/products/approve POST] Authorization successful for admin user: ${session.user.id}`)

    // Update product approval status
    const { error } = await supabase
      .from("products")
      .update({
        is_approved: true,
        is_active: true,
        approved_at: new Date().toISOString(),
        approved_by: session.user.id,
      })
      .eq("id", productId)

    if (error) {
      console.error("Error approving product:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get product owner
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("store:store_id(user_id, name), name")
      .eq("id", productId)
      .single()

    if (productError) {
      console.error("Error fetching product details:", productError)
      return NextResponse.json({ error: "Product details could not be fetched" }, { status: 500 })
    }

    if (product?.store?.user_id) {
      // Create notification for store owner
      await supabase.from("notifications").insert({
        user_id: product.store.user_id,
        type: "product_approved",
        message: `Ürününüz "${product.name}" onaylandı ve satışa sunuldu.`,
        product_id: productId,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in approve product route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
