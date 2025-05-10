import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse, NextRequest } from "next/server"
import { slugify } from "@/lib/utils"
import * as z from "zod"
import { createClient } from '@supabase/supabase-js'

// Zod schema for product update (partial, as not all fields are required for update)
const productUpdateSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters long.").optional(),
  store_id: z.string().uuid("Invalid store ID.").optional(), // Genellikle store_id değiştirilmez, ama admin için olabilir
  category_id: z.string().uuid("Invalid category ID.").optional(),
  price: z.number().positive("Price must be a positive number.").optional(),
  description: z.string().optional().nullable(),
  short_description: z.string().max(300, "Short description must be 300 characters or less.").optional().nullable(),
  stock_quantity: z.number().int().nonnegative("Stock quantity must be a non-negative integer.").optional(),
  image_url: z.string().url("Invalid image URL.").optional().nullable(),
  gallery_images: z.array(z.string().url()).optional().nullable(),
  slug: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  is_approved: z.boolean().optional().nullable(), // Admin tarafından yönetilir
  reject_reason: z.string().optional().nullable(), // Admin tarafından reddedilme sebebi
  is_featured: z.boolean().optional(),
  has_variants: z.boolean().optional(),
  tags: z.array(z.string()).optional().nullable(),
  brand: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  weight: z.number().positive("Weight must be a positive number.").optional().nullable(),
  dimensions: z.object({
    length: z.number().positive().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
  }).optional().nullable(),
  // Varyant güncelleme daha karmaşık olacağı için ayrı bir endpoint'te ele alınabilir.
  // Şimdilik ana ürün bilgilerinin güncellenmesine odaklanıyoruz.
  // Ancak, `has_variants` false ise ve `variants` arrayi gelirse hata verebiliriz veya temizleyebiliriz.
})

// Initialize Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Ensure this env var is set in your .env.local or environment
)

// GET /api/products/[id] - Get a specific product by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies })
  const productId = params.id

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    let query = supabase
      .from("products")
      .select(`
        *,
        store:store_id (id, name, slug, logo_url, user_id),
        category:category_id (id, name, slug),
        product_variants ( *, variant_values:product_variant_values (*, variant_attribute_values(*, attribute_type:variant_attribute_types(*))) ),
        reviews (id, rating, comment, created_at, user:user_id(id, full_name, avatar_url))
      `)
      .eq("id", productId)
      .maybeSingle()

    const { data: product, error } = await query

    if (error) {
      console.error(`Error fetching product ${productId}:`, error)
      return NextResponse.json({ error: "Error fetching product data." }, { status: 500 })
    }

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 })
    }

    // Authorization checks
    const isAdmin = session?.user?.role === "admin"
    const isSellerOwner = product.store?.user_id === session?.user?.id && session?.user?.role === "seller"

    if (!product.is_approved || !product.is_active) {
      // If product is not approved OR not active, only admin or seller owner can see it.
      if (!isAdmin && !isSellerOwner) {
        return NextResponse.json({ error: "Product not found or access denied." }, { status: 404 })
      }
    }
    // Public and regular users can see approved and active products.
    // Admins and Seller owners can always see it (covered by the block above).

    return NextResponse.json(product)
  } catch (e: any) {
    console.error(`Error in GET /api/products/${productId}:`, e)
    return NextResponse.json({ error: e.message || "Failed to fetch product." }, { status: 500 })
  }
}

// PUT /api/products/[id] - Update a product (changed from PATCH)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies })
  const productId = params.id

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: currentProduct, error: fetchError } = await supabase
      .from("products")
      .select("*, store:store_id(user_id)") // Fetch store_id to check ownership
      .eq("id", productId)
      .single()

    if (fetchError || !currentProduct) {
      return NextResponse.json({ error: "Product not found to update." }, { status: 404 })
    }

    const isAdmin = session.user.role === "admin"
    const isSellerOwner = currentProduct.store?.user_id === session.user.id && session.user.role === "seller"

    if (!isAdmin && !isSellerOwner) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to update this product." }, { status: 403 })
    }

    const body = await request.json()
    const validation = productUpdateSchema.partial().safeParse(body) // .partial() for update

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid product data for update", details: validation.error.format() }, { status: 400 })
    }

    let productDataToUpdate = validation.data

    // Handle slug update if name is changed
    if (productDataToUpdate.name && productDataToUpdate.name !== currentProduct.name) {
      let newSlug = slugify(productDataToUpdate.name)
      let slugExists = true
      let slugSuffix = 1
      while (slugExists) {
        const { data: existingProductWithSlug } = await supabase
          .from("products")
          .select("id")
          .eq("slug", newSlug)
          .neq("id", productId) // Exclude current product from check
          .maybeSingle()
        if (!existingProductWithSlug) {
          slugExists = false
        } else {
          newSlug = `${slugify(productDataToUpdate.name)}-${slugSuffix}`
          slugSuffix++
        }
      }
      productDataToUpdate.slug = newSlug
    }

    // If a seller updates, product goes back to pending approval and inactive
    // Admin can directly set is_approved and is_active states
    if (isSellerOwner && !isAdmin) {
      productDataToUpdate.is_approved = null; // Reset approval status
      productDataToUpdate.is_active = false;   // Deactivate product until re-approved
      productDataToUpdate.submitted_at = new Date().toISOString(); // Update submission time
      productDataToUpdate.reject_reason = null; // Clear previous rejection reason
      productDataToUpdate.approved_at = null; // Clear previous approval time
      productDataToUpdate.approved_by = null; // Clear previous approver
    } else if (isAdmin) {
      // Admin can set approval and active status directly. If not provided in body, keep current.
      productDataToUpdate.is_approved = body.is_approved !== undefined ? body.is_approved : currentProduct.is_approved
      productDataToUpdate.is_active = body.is_active !== undefined ? body.is_active : currentProduct.is_active
      if (body.is_approved === false && !body.reject_reason) {
        // If admin rejects, a reason might be expected from frontend, or set a default one.
        // productDataToUpdate.reject_reason = productDataToUpdate.reject_reason || "Rejected by admin.";
      }
    }

    productDataToUpdate.updated_at = new Date().toISOString()

    const { data: updatedProduct, error: updateError } = await supabase
      .from("products")
      .update(productDataToUpdate)
      .eq("id", productId)
      .select("*") // Select all fields of the updated product
      .single()

    if (updateError) {
      console.error(`Error updating product ${productId}:`, updateError)
      if (updateError.code === '23505') { // Unique constraint violation (e.g. slug, sku)
        return NextResponse.json({ error: "Unique constraint violation during update.", details: updateError.detail }, { status: 409 })
      }
      return NextResponse.json({ error: updateError.message || "Failed to update product" }, { status: 500 })
    }

    // TODO: More granular variant update logic (add/remove/update variants and their attributes)
    // This would likely be in a separate set of endpoints like /api/products/[id]/variants

    // Create notification for admins if seller updated and product needs re-approval
    if (isSellerOwner && !isAdmin) {
      const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin")
      if (admins && updatedProduct) { // Ensure updatedProduct is not null
        const notifications = admins.map((admin: { id: string }) => ({
          user_id: admin.id,
          title: productDataToUpdate.is_approved === null ? "Ürün Güncellendi - Onay Bekliyor" : "Ürün Admin Tarafından Güncellendi",
          content: `"${updatedProduct.name}" adlı ürün satıcı tarafından güncellendi ve yeniden onay bekliyor.`,
          type: "product_updated_needs_approval",
          related_id: updatedProduct.id,
          action_url: `/admin/products?tab=pending` // Link to pending tab
        }));
        // Also notify seller that their update submitted the product for re-approval
        if (currentProduct.store?.user_id && productDataToUpdate.is_approved === null) {
          notifications.push({
            user_id: currentProduct.store.user_id, // Seller's user ID
            title: "Ürününüz Güncellendi ve Onaya Gönderildi",
            content: `"${updatedProduct.name}" adlı ürününüz güncellendi ve yönetici onayı için gönderildi. Onaylandıktan sonra yayına alınacaktır.`,
            type: 'product_updated_for_reapproval',
            related_id: updatedProduct.id,
            action_url: `/seller/products/${updatedProduct.id}/edit`
          });
        }
        await supabase.from("notifications").insert(notifications);
      }
    }

    return NextResponse.json(updatedProduct)
  } catch (e: any) {
    console.error(`Error in PUT /api/products/${productId}:`, e)
    return NextResponse.json({ error: e.message || "Failed to update product" }, { status: 500 })
  }
}

// DELETE /api/products/[id] - Delete a product
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id

  if (!productId) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
  }

  try {
    // Get product details for revalidation
    const { data: productDetails } = await supabaseAdmin
      .from('products')
      .select('slug, store:store_id(slug)')
      .eq('id', productId)
      .single();

    // Soft delete the product by setting is_active to false
    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .select()
      .single()

    if (error) {
      console.error('Error soft deleting product:', error)
      if (error.code === 'PGRST116') { // PostgREST error for "Not found"
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message || 'Failed to delete product' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Product not found after update attempt' }, { status: 404 })
    }

    // Revalidate relevant paths to update the UI
    const revalidator = (await import('next/cache')).revalidatePath;

    revalidator('/'); // Revalidate homepage
    revalidator('/seller/products'); // Revalidate seller products page

    // Revalidate store page if available
    if (productDetails?.store && typeof productDetails.store === 'object' && 'slug' in productDetails.store && productDetails.store.slug) {
      revalidator(`/magaza/${productDetails.store.slug}`);
    }

    // Revalidate product page if available
    if (productDetails?.slug) {
      revalidator(`/urun/${productDetails.slug}`);
    }

    // Revalidate other common product listing pages
    revalidator('/kategoriler');
    revalidator('/one-cikanlar');
    revalidator('/firsatlar');

    return NextResponse.json({ message: 'Product successfully deactivated', product: data }, { status: 200 })

  } catch (err: any) {
    console.error('Catch DELETE product:', err)
    return NextResponse.json({ error: err.message || 'An unexpected error occurred' }, { status: 500 })
  }
}
