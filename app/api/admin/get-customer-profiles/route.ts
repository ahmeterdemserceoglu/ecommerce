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
    const customerIds = searchParams.get("customerIds")

    if (!customerIds) {
      return NextResponse.json({ error: "Customer IDs are required" }, { status: 400 })
    }

    const ids = customerIds.split(",")

    const adminClient = createAdminClient()
    if (!adminClient) {
      return NextResponse.json(
        { error: "Admin client could not be created. Check server environment variables." },
        { status: 500 },
      )
    }

    // Get customer profiles using admin client to bypass RLS
    const { data, error } = await adminClient.from("profiles").select("id, full_name, email, phone").in("id", ids)

    if (error) {
      console.error("Error fetching profiles:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error("Error in get-customer-profiles API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
