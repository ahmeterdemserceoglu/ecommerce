import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { slugify } from "@/lib/utils"

// POST /api/products - Create a new product
export async function POST(request: Request) {
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

    // Check if user owns the store
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("id", data.store_id)
      .eq("owner_id", user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: "Unauthorized store access" }, { status: 403 })
    }

    // Generate slug if not provided
    const slug = data.slug || slugify(data.name)

    // Create product with approval status
    const { data: product, error } = await supabase
      .from("products")
      .insert({
        ...data,
        slug,
        is_approved: null, // Pending approval
        is_active: false, // Inactive until approved
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating product:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create notification for admins
    const { data: admins } = await supabase.from("users").select("id").eq("role", "admin")

    if (admins) {
      const notifications = admins.map((admin) => ({
        user_id: admin.id,
        type: "new_product",
        message: `Yeni ürün onay bekliyor: ${data.name}`,
        product_id: product.id,
      }))

      await supabase.from("notifications").insert(notifications)
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error("Error in create product route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET /api/products - Get products based on user role and filters
export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)

    // Get user role
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let query = supabase.from("products").select(`
      *,
      store:store_id(id, name, slug),
      category:category_id(id, name, slug)
    `)

    // Apply filters based on user role
    if (!user) {
      // Public users can only see approved and active products
      query = query.eq("is_approved", true).eq("is_active", true)
    } else if (user.role === "admin") {
      // Admins can see all products
      // Apply status filter if provided
      const status = searchParams.get("status")
      if (status === "new") {
        const oneDayAgo = new Date()
        oneDayAgo.setDate(oneDayAgo.getDate() - 1)
        query = query.is("is_approved", null).gte("created_at", oneDayAgo.toISOString())
      } else if (status === "pending") {
        query = query.is("is_approved", null)
      } else if (status === "approved") {
        query = query.eq("is_approved", true)
      } else if (status === "rejected") {
        query = query.eq("is_approved", false)
      }
    } else {
      // Store owners can see their own products and approved products
      query = query.or(`store_id.eq.${searchParams.get("store_id")},and(is_approved.eq.true,is_active.eq.true)`)
    }

    // Apply other filters
    const category = searchParams.get("category")
    if (category) query = query.eq("category_id", category)

    const store = searchParams.get("store")
    if (store) query = query.eq("store_id", store)

    const featured = searchParams.get("featured")
    if (featured) query = query.eq("is_featured", featured === "true")

    // Apply sorting
    const sort = searchParams.get("sort") || "created_at"
    const order = searchParams.get("order") || "desc"
    query = query.order(sort, { ascending: order === "asc" })

    const { data, error } = await query

    if (error) {
      console.error("Error fetching products:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in get products route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
