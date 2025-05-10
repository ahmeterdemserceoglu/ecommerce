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
    console.error("[API /api/admin/check-rls-functions GET] Error getting session:", sessionError.message)
    return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 })
  }
  if (!session) {
    console.log("[API /api/admin/check-rls-functions GET] No session found.")
    return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 })
  }
  const { data: profile, error: profileError } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (profileError) {
    console.error(`[API /api/admin/check-rls-functions GET] Error fetching profile for user ${session.user.id}:`, profileError.message)
    return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 })
  }
  if (!profile || profile.role !== 'admin') {
    console.warn(`[API /api/admin/check-rls-functions GET] Authorization failed. User role: ${profile?.role} (Expected 'admin')`)
    return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 })
  }
  console.log(`[API /api/admin/check-rls-functions GET] Admin user ${session.user.id} authorized.`)
  // End admin authorization check

  try {
    const adminClient = createAdminClient()

    if (!adminClient) {
      return NextResponse.json(
        { error: "Admin client could not be created. Check server environment variables." },
        { status: 500 },
      )
    }

    // Check existing functions
    const checkFunctionsSQL = `
    SELECT 
      p.proname AS function_name,
      pg_get_function_arguments(p.oid) AS function_arguments,
      t.typname AS return_type
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_type t ON p.prorettype = t.oid
    WHERE n.nspname = 'public'
      AND p.proname IN ('is_admin', 'is_store_owner');
    `

    const { data, error } = await adminClient.rpc("admin_run_sql", { sql: checkFunctionsSQL })

    if (error) {
      console.error("Error checking functions:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      functions: data,
      message: "Function information retrieved successfully",
    })
  } catch (error: any) {
    console.error("Error checking RLS functions:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
