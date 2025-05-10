import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse, NextRequest } from "next/server"
import { slugify } from "@/lib/utils"
import * as z from "zod"

// Zod schema for product validation
const productSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters long."),
  store_id: z.string().uuid("Invalid store ID."),
  category_id: z.string().uuid("Invalid category ID."),
  price: z.number().positive("Price must be a positive number."),
  description: z.string().optional(),
  short_description: z.string().max(300, "Short description must be 300 characters or less.").optional(),
  stock_quantity: z.number().int().nonnegative("Stock quantity must be a non-negative integer.").optional().default(0),
  image_url: z.string().url("Invalid image URL.").optional().nullable(),
  gallery_images: z.array(z.string().url()).optional().nullable(), // Array of image URLs
  slug: z.string().optional(), // Will be auto-generated if not provided
  is_active: z.boolean().optional().default(false), // Defaults to inactive, admin approves
  is_featured: z.boolean().optional().default(false),
  has_variants: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().nullable(),
  brand: z.string().optional().nullable(),
  sku: z.string().optional().nullable(), // Main product SKU if no variants
  weight: z.number().positive("Weight must be a positive number.").optional().nullable(),
  dimensions: z.object({ // Optional dimensions object
    length: z.number().positive().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
  }).optional().nullable(),
  // Fields for variants - will be handled if has_variants is true
  variants: z.array(z.object({
    price: z.number().positive(),
    stock_quantity: z.number().int().nonnegative(),
    sku: z.string().optional().nullable(),
    image_url: z.string().url().optional().nullable(),
    is_default: z.boolean().optional().default(false),
    attributes: z.array(z.object({ // e.g., [{ type: "Color", value: "Red" }, { type: "Size", value: "M" }]
      type_id: z.string().uuid(), // Reference to variant_attribute_types.id (e.g., for "Color")
      value_id: z.string().uuid(), // Reference to variant_attribute_values.id (e.g., for "Red")
    })).min(1, "Variant must have at least one attribute.")
  })).optional(),
})

// POST /api/products - Create a new product
export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Sellers and Admins can create products
  if (session.user.role !== "seller" && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: You do not have permission to create products." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const validation = productSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid product data", details: validation.error.format() }, { status: 400 })
    }

    const productData = validation.data

    // Verify store ownership if the user is a seller
    if (session.user.role === "seller") {
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("id")
        .eq("id", productData.store_id)
        .eq("user_id", session.user.id) // Changed from owner_id to user_id for consistency with stores table
        .single()

      if (storeError || !store) {
        return NextResponse.json({ error: "Store not found or you do not own this store." }, { status: 403 })
      }
    } // Admins can create products for any store, store_id must be valid if provided by admin.

    // Generate slug if not provided, and ensure uniqueness
    let slug = productData.slug || slugify(productData.name)
    let slugExists = true
    let slugSuffix = 1
    while (slugExists) {
      const { data: existingProduct, error: slugError } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle() // Use maybeSingle to avoid error if no product found

      if (slugError) {
        console.error("Error checking slug uniqueness:", slugError)
        return NextResponse.json({ error: "Error checking slug uniqueness" }, { status: 500 })
      }
      if (!existingProduct) {
        slugExists = false
      } else {
        slug = `${slugify(productData.name)}-${slugSuffix}`
        slugSuffix++
      }
    }
    productData.slug = slug

    // Prepare product insert data (excluding variants array from main product table)
    const { variants, ...mainProductData } = productData

    const productToInsert = {
      ...mainProductData,
      is_approved: session.user.role === 'admin' ? true : null, // Admins can auto-approve, seller products pend approval
      is_active: session.user.role === 'admin' ? productData.is_active : false, // Seller products inactive until approved
      submitted_at: new Date().toISOString(),
      user_id: session.user.id, // Track who created/submitted the product
    }

    const { data: newProduct, error: productInsertError } = await supabase
      .from("products")
      .insert(productToInsert)
      .select()
      .single()

    if (productInsertError || !newProduct) {
      console.error("Error creating product:", productInsertError)
      return NextResponse.json({ error: productInsertError?.message || "Failed to create product" }, { status: 500 })
    }

    // Handle variants if has_variants is true and variants are provided
    if (newProduct.has_variants && variants && variants.length > 0) {
      const variantInserts = []
      for (const variant of variants) {
        const { attributes, ...variantData } = variant
        const { data: newVariant, error: variantError } = await supabase
          .from("product_variants")
          .insert({
            ...variantData,
            product_id: newProduct.id,
            store_id: newProduct.store_id, // Ensure store_id is also in product_variants
          })
          .select("id")
          .single()

        if (variantError || !newVariant) {
          console.error("Error creating product variant, rolling back product:", variantError)
          await supabase.from("products").delete().eq("id", newProduct.id) // Rollback main product
          return NextResponse.json({ error: variantError?.message || "Failed to create variant" }, { status: 500 })
        }

        // Insert variant attributes (product_variant_values table)
        const attributeValuesToInsert = attributes.map(attr => ({
          product_variant_id: newVariant.id,
          variant_attribute_type_id: attr.type_id,
          variant_attribute_value_id: attr.value_id,
        }))

        const { error: attributeError } = await supabase.from("product_variant_values").insert(attributeValuesToInsert)
        if (attributeError) {
          console.error("Error creating variant attributes, rolling back product & variants:", attributeError)
          await supabase.from("product_variants").delete().eq("product_id", newProduct.id) // Rollback variants
          await supabase.from("products").delete().eq("id", newProduct.id) // Rollback main product
          return NextResponse.json({ error: attributeError?.message || "Failed to create variant attributes" }, { status: 500 })
        }
        variantInserts.push({ ...newVariant, attributes })
      }
      newProduct.variants = variantInserts // Attach created variants to the response
    }

    // Create notification for admins if product submitted by seller and needs approval
    if (session.user.role === "seller") {
      const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin") // Assuming profiles table for users
      if (admins) {
        const notifications = admins.map((admin: { id: string }) => ({
          user_id: admin.id,
          type: "product_approval_pending",
          message: `New product approval request: ${newProduct.name} by store ${productData.store_id}`,
          reference_id: newProduct.id, // product_id
          related_store_id: productData.store_id,
        }))
        await supabase.from("notifications").insert(notifications)
      }
    }

    return NextResponse.json(newProduct, { status: 201 })
  } catch (error: any) {
    console.error("Error in POST /api/products route:", error)
    if (error.code === '23505') { // Postgres unique violation
      return NextResponse.json({ error: "Unique constraint violation. Slug or SKU might already exist.", details: error.detail }, { status: 409 })
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

// GET /api/products - Get products based on user role and filters
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "10", 10)
    const offset = (page - 1) * limit

    // Search parameter
    const searchTerm = searchParams.get("q")

    let query = supabase.from("products").select(`
      id, name, slug, price, discount_price, stock_quantity, image_url, is_active, is_approved, is_featured, created_at, description,
      store:store_id (id, name, slug, logo_url),
      category:category_id (id, name, slug),
      product_variants ( id, price, stock_quantity, sku, is_default, image_url, variant_values:product_variant_values (value_id, variant_attribute_values(id, name, type) ) )
    `, { count: "exact" })

    // Apply filters based on user role and query params
    if (!session) {
      // Public users: only approved and active products
      query = query.eq("is_approved", true).eq("is_active", true)
    } else {
      // Authenticated users
      if (session.user.role === "admin") {
        // Admin: can see all products, apply status filter
        const status = searchParams.get("status")
        if (status === "pending") {
          query = query.is("is_approved", null)
        } else if (status === "approved") {
          query = query.eq("is_approved", true)
        } else if (status === "rejected") {
          query = query.eq("is_approved", false)
        } else if (status === "inactive") {
          query = query.eq("is_active", false)
        }
        // Admin can also filter by store_id if provided
        const adminStoreFilter = searchParams.get("store_id")
        if (adminStoreFilter) {
          query = query.eq("store_id", adminStoreFilter)
        }
      } else if (session.user.role === "seller") {
        const { data: sellerStores, error: sellerStoresError } = await supabase
          .from("stores")
          .select("id")
          .eq("user_id", session.user.id)

        if (sellerStoresError) {
          console.error("Error fetching seller stores:", sellerStoresError)
          return NextResponse.json({ error: "Could not fetch seller stores" }, { status: 500 })
        }

        const sellerStoreIds = sellerStores.map(s => s.id)
        const storeIdFilter = searchParams.get("store_id")

        if (storeIdFilter) {
          if (sellerStoreIds.includes(storeIdFilter)) {
            query = query.eq("store_id", storeIdFilter)
          } else {
            return NextResponse.json({ data: [], count: 0, message: "Access denied to this store's products or store not found." }, { status: 403 })
          }
        } else {
          if (sellerStoreIds.length > 0) {
            query = query.in("store_id", sellerStoreIds)
          } else {
            query = query.eq("id", "nonexistent-id-to-return-empty")
          }
        }
      } else {
        query = query.eq("is_approved", true).eq("is_active", true)
      }
    }

    const categoryId = searchParams.get("category_id")
    if (categoryId) query = query.eq("category_id", categoryId)

    const storeId = searchParams.get("store_id_public_filter")
    if (storeId) query = query.eq("store_id", storeId)

    const featured = searchParams.get("featured")
    if (featured) query = query.eq("is_featured", featured === "true")

    const minPrice = searchParams.get("min_price")
    if (minPrice) query = query.gte("price", parseFloat(minPrice))

    const maxPrice = searchParams.get("max_price")
    if (maxPrice) query = query.lte("price", parseFloat(maxPrice))

    if (searchTerm) {
      const searchString = `%${searchTerm.split(' ').join('%')}%`
      query = query.or(`name.ilike.${searchString},description.ilike.${searchString},slug.ilike.${searchString}`)
    }

    const sortParam = searchParams.get("sort")
    let sortField = "created_at"
    let sortAscending = false

    if (sortParam) {
      const [field, direction] = sortParam.split(":")
      sortField = ["name", "price", "created_at", "updated_at", "rating"].includes(field) ? field : "created_at"
      sortAscending = direction === "asc"
    }

    query = query.order(sortField, { ascending: sortAscending })
    if (sortField !== 'created_at') {
      query = query.order('created_at', { ascending: false })
    }

    query = query.range(offset, offset + limit - 1)

    const { data: products, error, count } = await query

    if (error) {
      console.error("Error fetching products:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ products, count: count ?? 0, page, limit })
  } catch (error: any) {
    console.error("Error in GET /api/products route:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
