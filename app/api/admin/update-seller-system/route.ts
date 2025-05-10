import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse, NextRequest } from "next/server"
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  const cookieStore = cookies()
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // Standardized Admin authorization check
    const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession()
    if (sessionError) {
      console.error("[API /api/admin/update-seller-system POST] Error getting session:", sessionError.message)
      return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 })
    }
    if (!session) {
      console.log("[API /api/admin/update-seller-system POST] No session found.")
      return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 })
    }
    const { data: userProfile, error: profileError } = await supabaseAuth
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    if (profileError) {
      console.error(`[API /api/admin/update-seller-system POST] Error fetching profile for user ${session.user.id}:`, profileError.message)
      return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 })
    }
    if (!userProfile || userProfile.role !== 'admin') {
      console.warn(`[API /api/admin/update-seller-system POST] Authorization failed. User role: ${userProfile?.role} (Expected 'admin')`)
      return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 })
    }
    console.log(`[API /api/admin/update-seller-system POST] Admin user ${session.user.id} authorized.`)
    // End standardized admin authorization check

    // Initialize Supabase client with SERVICE_ROLE_KEY for subsequent operations
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Check if sellers table exists (using admin client)
    const { data: tableExists, error: tableCheckError } = await supabaseAdmin.rpc("check_table_exists", {
      table_name: "sellers",
    })

    // If sellers table doesn't exist or error checking, create it (using admin client)
    if (!tableExists || (tableExists && !(tableExists as any).exists) || tableCheckError) {
      if (tableCheckError) console.error("Error checking if sellers table exists, attempting creation:", tableCheckError)
      else console.log("Sellers table does not exist or check was inconclusive, attempting creation.")

      // Create sellers table
      const createSellersTableSQL = `
        CREATE TABLE IF NOT EXISTS public.sellers (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          store_id UUID REFERENCES public.stores(id),
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Add RLS policies
        ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
        
        -- Allow users to see their own seller records
        CREATE POLICY "Users can view their own seller records" 
          ON public.sellers 
          FOR SELECT 
          USING (auth.uid() = user_id);
          
        -- Allow admins to see all seller records
        CREATE POLICY "Admins can view all seller records" 
          ON public.sellers 
          FOR SELECT 
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE id = auth.uid() AND role = 'admin'
            )
          );
      `

      try {
        // Use supabaseAdmin for this RPC call
        await supabaseAdmin.rpc("execute_sql", { query: createSellersTableSQL })
        console.log("Sellers table creation attempt finished.")
      } catch (error) {
        console.error("Error creating sellers table:", error)
      }
    }

    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), "lib", "database", "sql-update-seller-system.sql")
    const sqlQuery = fs.readFileSync(sqlFilePath, "utf8")

    // Execute the query (using admin client)
    try {
      // First try using the execute_sql function with admin client
      const { data, error } = await supabaseAdmin.rpc("execute_sql", { query: sqlQuery })

      if (error) {
        console.warn("RPC execute_sql with supabaseAdmin failed, trying direct fetch with service key. Error:", error)
        // If the function doesn't exist or fails, try direct execution with service key
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
    console.error("Error in update-seller-system route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
