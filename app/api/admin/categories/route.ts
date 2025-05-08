import { NextResponse } from "next/server"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 })
    }

    const supabase = createServerComponentClient({ cookies })

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
