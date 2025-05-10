import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse, NextRequest } from "next/server"
import fs from "fs"
import path from "path"

export async function POST(request: NextRequest) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // Standardized Admin authorization check
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.error("[API /api/admin/update-stores POST] Error getting session:", sessionError.message)
      return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 })
    }
    if (!session) {
      console.log("[API /api/admin/update-stores POST] No session found.")
      return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 })
    }
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()
    if (profileError) {
      console.error(`[API /api/admin/update-stores POST] Error fetching profile for user ${session.user.id}:`, profileError.message)
      return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 })
    }
    if (!userProfile || userProfile.role !== "admin") {
      console.warn(`[API /api/admin/update-stores POST] Authorization failed. User role: ${userProfile?.role} (Expected 'admin')`)
      return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 })
    }
    console.log(`[API /api/admin/update-stores POST] Admin user ${session.user.id} authorized.`)
    // End standardized admin authorization check

    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), "lib", "database", "sql-update-stores.sql")
    const sqlQuery = fs.readFileSync(sqlFilePath, "utf8")

    // Execute the query
    try {
      // First try using the execute_sql function
      const { data, error } = await supabase.rpc("execute_sql", { query: sqlQuery })

      if (error) {
        // If the function doesn't exist, try direct execution
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.SUPABASE_ANON_KEY || "",
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ""}`,
          },
          body: JSON.stringify({ query: sqlQuery }),
        })

        if (!response.ok) {
          // If that fails too, try using the API endpoint
          const apiResponse = await fetch("/api/admin/execute-sql", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: sqlQuery, isSetup: true }),
          })

          if (!apiResponse.ok) {
            const errorData = await apiResponse.json()
            throw new Error(errorData.error || "Failed to execute query")
          }
        }
      }

      return NextResponse.json({ success: true })
    } catch (error: any) {
      console.error("Error executing SQL update:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Error in update-stores route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
