import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { slugify } from "@/lib/utils"

// PATCH /api/products/[id] - Update a product
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const data = await request.json()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the current product
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("store_id")
      .eq("id", params.id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Check authorization (admin or store owner)
    if (user.role !== "admin") {
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("owner_id")
        .eq("id", product.store_id)
        .single()

      if (storeError || !store || store.owner_id !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }
    }

    // Generate slug if name is being updated
    const slug = data.name ? slugify(data.name) : undefined

    // Update product and reset approval status
    const { data: updatedProduct, error } = await supabase
      .from("products")
      .update({
        ...data,
        slug,
        is_approved: null, // Reset to pending
        is_active: false, // Deactivate until approved
        submitted_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating product:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create notification for admins
    const { data: admins } = await supabase.from("users").select("id").eq("role", "admin")

    if (admins) {
      const notifications = admins.map((admin) => ({
        user_id: admin.id,
        type: "product_updated",
        message: `Güncellenmiş ürün onay bekliyor: ${data.name || updatedProduct.name}`,
        product_id: params.id,
      }))

      await supabase.from("notifications").insert(notifications)
    }

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error("Error in update product route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/products/[id] - Delete a product
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the current product
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("store_id")
      .eq("id", params.id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Check authorization (admin or store owner)
    if (user.role !== "admin") {
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("owner_id")
        .eq("id", product.store_id)
        .single()

      if (storeError || !store || store.owner_id !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }
    }

    // Delete product
    const { error } = await supabase.from("products").delete().eq("id", params.id)

    if (error) {
      console.error("Error deleting product:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in delete product route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
