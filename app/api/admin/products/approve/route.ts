import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { productId } = await request.json()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Update product approval status
    const { error } = await supabase
      .from("products")
      .update({
        is_approved: true,
        is_active: true,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
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
