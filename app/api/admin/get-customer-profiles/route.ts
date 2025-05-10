import { NextResponse, NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

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

export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })

  // Admin authorization check
  const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession()
  if (sessionError) {
    console.error("[API /api/admin/get-customer-profiles GET] Error getting session:", sessionError.message)
    return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 })
  }
  if (!session) {
    console.log("[API /api/admin/get-customer-profiles GET] No session found.")
    return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 })
  }
  const { data: profile, error: profileError } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (profileError) {
    console.error(`[API /api/admin/get-customer-profiles GET] Error fetching profile for user ${session.user.id}:`, profileError.message)
    return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 })
  }
  if (!profile || profile.role !== 'admin') {
    console.warn(`[API /api/admin/get-customer-profiles GET] Authorization failed. User role: ${profile?.role} (Expected 'admin')`)
    return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 })
  }
  console.log(`[API /api/admin/get-customer-profiles GET] Admin user ${session.user.id} authorized.`)
  // End admin authorization check

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
