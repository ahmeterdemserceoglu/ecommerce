import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const { tableName } = await request.json()

    if (!tableName) {
      return NextResponse.json({ error: "Table name is required" }, { status: 400 })
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Check if the user is authenticated and is an admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if the user is an admin
    const { data: userData, error: userError } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (userError || !userData || userData.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
