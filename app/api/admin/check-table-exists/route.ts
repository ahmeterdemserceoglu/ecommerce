import { NextResponse, NextRequest } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { tableName } = await request.json()

    if (!tableName) {
      return NextResponse.json({ error: "Table name is required" }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Standardized Admin authorization check
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.error("[API /api/admin/check-table-exists POST] Error getting session:", sessionError.message)
      return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 })
    }
    if (!session) {
      console.log("[API /api/admin/check-table-exists POST] No session found.")
      return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 })
    }
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    if (profileError) {
      console.error(`[API /api/admin/check-table-exists POST] Error fetching profile for user ${session.user.id}:`, profileError.message)
      return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 })
    }
    if (!userProfile || userProfile.role !== 'admin') {
      console.warn(`[API /api/admin/check-table-exists POST] Authorization failed. User role: ${userProfile?.role} (Expected 'admin')`)
      return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 })
    }
    console.log(`[API /api/admin/check-table-exists POST] Admin user ${session.user.id} authorized for table: ${tableName}.`)
    // End standardized admin authorization check

    // Check if the table exists
    const { data, error } = await supabase.rpc("check_table_exists", {
      table_name: tableName,
    })

    if (error) {
      // If the RPC function doesn't exist, try a direct query
      const { data: tableExists, error: tableError } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public")
        .eq("table_name", tableName)
        .single()

      if (tableError && tableError.code !== "PGRST116") {
        // PGRST116 is "No rows returned" error
        return NextResponse.json({ error: tableError.message }, { status: 500 })
      }

      return NextResponse.json({ exists: !!tableExists })
    }

    return NextResponse.json({ exists: data })
  } catch (error: any) {
    console.error("Error checking if table exists:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
