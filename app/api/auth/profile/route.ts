import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// Create a Supabase client with admin privileges to bypass RLS
const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseServiceKey) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY is not defined. Using regular client.")
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
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Try with regular client first
    let { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

    // If there's an error and it's not just "not found"
    if (error && error.code !== "PGRST116") {
      console.error("Error fetching profile with regular client:", error)

      // Try with admin client as fallback
      const adminClient = createAdminClient()
      if (adminClient) {
        const { data: adminProfile, error: adminError } = await adminClient
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single()

        if (adminError) {
          if (adminError.code === "PGRST116") {
            // Not found is ok
            return NextResponse.json({ profile: null }, { status: 404 })
          }
          console.error("Error fetching profile with admin client:", adminError)
          return NextResponse.json({ error: adminError.message }, { status: 500 })
        }

        profile = adminProfile
      }
    }

    if (!profile) {
      return NextResponse.json({ profile: null }, { status: 404 })
    }

    return NextResponse.json({ profile })
  } catch (error: any) {
    console.error("Profile API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId, fullName, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ error: "User ID and email are required" }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // First check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (existingProfile) {
      return NextResponse.json({ profile: existingProfile })
    }

    // Try to create profile with regular client
    const { data: profile, error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        full_name: fullName || email.split("@")[0],
        email: email,
        role: "user",
      })
      .select()
      .single()

    // If there's an error with regular client, try with admin client
    if (error) {
      console.warn("Error creating profile with regular client:", error)

      const adminClient = createAdminClient()
      if (adminClient) {
        const { data: adminProfile, error: adminError } = await adminClient
          .from("profiles")
          .insert({
            id: userId,
            full_name: fullName || email.split("@")[0],
            email: email,
            role: "user",
          })
          .select()
          .single()

        if (adminError) {
          console.error("Error creating profile with admin client:", adminError)
          return NextResponse.json({ error: adminError.message }, { status: 500 })
        }

        return NextResponse.json({ profile: adminProfile })
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (error: any) {
    console.error("Profile API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
