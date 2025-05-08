import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // Check if user is authenticated and is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user role from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if sellers table exists
    const { data: tableExists, error: tableCheckError } = await supabase.rpc("check_table_exists", {
      table_name: "sellers",
    })

    // If sellers table doesn't exist, create it
    if (!tableExists || tableCheckError) {
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
        await supabase.rpc("execute_sql", { query: createSellersTableSQL })
      } catch (error) {
        console.error("Error creating sellers table:", error)
      }
    }

    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), "lib", "database", "sql-update-seller-system.sql")
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
    console.error("Error in update-seller-system route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
