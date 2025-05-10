import { NextResponse, NextRequest } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("[API /api/admin/categories DELETE] Error getting session:", sessionError.message)
      return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 })
    }

    if (!session) {
      console.log("[API /api/admin/categories DELETE] No session found on the server.")
      return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 })
    }

    console.log(`[API /api/admin/categories DELETE] Session User ID: ${session.user.id}. Fetching profile for role check.`)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error(`[API /api/admin/categories DELETE] Error fetching profile for user ${session.user.id}:`, profileError.message)
      return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 })
    }

    if (!profile) {
      console.warn(`[API /api/admin/categories DELETE] Profile not found for user ${session.user.id}. Authorization denied.`)
      return NextResponse.json({ error: "Unauthorized: User profile not found." }, { status: 403 })
    }

    const userRoleFromProfile = profile.role
    console.log(`[API /api/admin/categories DELETE] User role from profile: ${userRoleFromProfile}`)

    if (userRoleFromProfile !== 'admin') {
      console.warn(`[API /api/admin/categories DELETE] Authorization failed. User role: ${userRoleFromProfile} (Expected 'admin')`)
      return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 })
    }

    console.log(`[API /api/admin/categories DELETE] Authorization successful for admin user: ${session.user.id}`)

    const url = new URL(request.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 })
    }

    // Check if category has children
    const { data: children, error: childrenError } = await supabase.from("categories").select("id").eq("parent_id", id)

    if (childrenError) {
      return NextResponse.json({ error: childrenError.message }, { status: 500 })
    }

    if (children && children.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with subcategories. Please delete subcategories first." },
        { status: 400 },
      )
    }

    // Check if category has products
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id")
      .eq("category_id", id)
      .limit(1)

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 })
    }

    if (products && products.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with products. Please remove or reassign products first." },
        { status: 400 },
      )
    }

    // Delete category
    const { error: deleteError } = await supabase.from("categories").delete().eq("id", id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
