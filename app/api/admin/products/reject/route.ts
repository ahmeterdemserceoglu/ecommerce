import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { productId, reason } = await request.json()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Update product rejection status
    const { error } = await supabase
      .from("products")
      .update({
        is_approved: false,
        is_active: false,
        reject_reason: reason,
      })
      .eq("id", productId)

    if (error) {
      console.error("Error rejecting product:", error)
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
        type: "product_rejected",
        message: `Ürününüz "${product.name}" reddedildi. Sebep: ${reason}`,
        product_id: productId,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in reject product route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
