import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import type { NextRequest } from "next/server"
import type { Database } from "@/lib/database.types"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const formData = await request.formData()
  const email = String(formData.get("email"))
  const password = String(formData.get("password"))
  const action = String(formData.get("action"))
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const adminClient = supabaseAdmin()

  if (action === "signup") {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${requestUrl.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error("Sign up error:", error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data }, { status: 200 })
  }

  // Giriş sorunu düzeltme
  // POST metodunda signIn işlemini güncelle
  if (action === "signin") {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // Improve error handling in the POST method
    if (error) {
      console.error("Sign in error:", error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Kullanıcı oturumunu kontrol et
    const { data: sessionCheck, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !sessionCheck.session) {
      console.error("Session check error:", sessionError?.message || "No session found after login")
      return NextResponse.json({ error: "Giriş yapılamadı. Lütfen tekrar deneyin." }, { status: 401 })
    }

    // Get user profile data - first try with regular client
    let profile = null
    let profileError = null

    try {
      const result = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

      profile = result.data
      profileError = result.error
    } catch (err) {
      console.error("Error fetching profile:", err)
      profileError = { message: "Failed to fetch profile" }
    }

    // If profile doesn't exist, create it using admin client if available
    if (profileError && profileError.code === "PGRST116") {
      try {
        // Try with admin client first if available
        if (adminClient) {
          const { data: newProfile, error: insertError } = await adminClient
            .from("profiles")
            .insert({
              id: data.user.id,
              full_name: data.user.user_metadata?.full_name || email.split("@")[0],
              email: email,
              role: "user",
            })
            .select()
            .single()

          if (insertError) {
            console.error("Profile creation error with admin client:", insertError.message)
          } else {
            profile = newProfile
          }
        } else {
          // Fallback to regular client
          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: data.user.id,
              full_name: data.user.user_metadata?.full_name || email.split("@")[0],
              email: email,
              role: "user",
            })
            .select()
            .single()

          if (insertError) {
            console.error("Profile creation error with regular client:", insertError.message)
          } else {
            profile = newProfile
          }
        }
      } catch (error) {
        console.error("Profile creation error:", error)
      }
    }

    return NextResponse.json({
      user: {
        ...data.user,
        role: profile?.role || "user",
        fullName: profile?.full_name || data.user.user_metadata?.full_name,
      },
    })
  }

  return NextResponse.redirect(requestUrl.origin, { status: 301 })
}
