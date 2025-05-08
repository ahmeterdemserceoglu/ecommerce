import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
