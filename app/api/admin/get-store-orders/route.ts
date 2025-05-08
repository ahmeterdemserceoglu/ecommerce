import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create a Supabase client with admin privileges to bypass RLS
const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseServiceKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is not defined")
    return null
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("storeId")

    if (!storeId) {
      return NextResponse.json({ error: "Store ID is required" }, { status: 400 })
    }

    const adminClient = createAdminClient()
    if (!adminClient) {
      return NextResponse.json(
        { error: "Admin client could not be created. Check server environment variables." },
        { status: 500 },
      )
    }

    // Get all orders for this store
    const { data: ordersData, error: ordersError } = await adminClient
      .from("orders")
      .select("id, user_id, total_amount, created_at")
      .eq("store_id", storeId)

    if (ordersError) {
      console.error("Error fetching orders:", ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    return NextResponse.json(ordersData || [])
  } catch (error: any) {
    console.error("Error in get-store-orders:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
