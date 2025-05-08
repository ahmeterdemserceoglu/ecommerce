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
