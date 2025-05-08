import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { CookieOptions } from "@supabase/ssr"

// Update the profile creation in the POST method to use the admin client
export async function POST(request: Request) {
  try {
    const { action, email, password, fullName } = await request.json()

    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options, maxAge: 60 * 60 * 24 * 30 })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 })
          },
        },
      },
    )

    // Create admin client for operations that need to bypass RLS
    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value
            },
            set(name: string, value: string, options: CookieOptions) {
              cookieStore.set({ name, value, ...options, maxAge: 60 * 60 * 24 * 30 })
            },
            remove(name: string, options: CookieOptions) {
              cookieStore.set({ name, value: "", ...options, maxAge: 0 })
            },
          },
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      : null

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

    if (action === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        console.error("Sign up error:", error.message)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      // Create profile record using admin client if available
      if (data.user) {
        try {
          let profileCreated = false

          // Try with admin client first if available
          if (adminClient) {
            const { error: profileError } = await adminClient.from("profiles").insert({
              id: data.user.id,
              full_name: fullName,
              email: email,
              role: "user",
            })

            if (!profileError) {
              profileCreated = true
            } else if (profileError.code !== "23505") {
              // Ignore duplicate key errors
              console.warn("Error creating profile with admin client:", profileError)
            }
          }

          // Fallback to regular client if admin client failed or isn't available
          if (!profileCreated) {
            const { error: profileError } = await supabase.from("profiles").insert({
              id: data.user.id,
              full_name: fullName,
              email: email,
              role: "user",
            })

            if (profileError && profileError.code !== "23505") {
              // Ignore duplicate key errors
              console.warn("Error creating profile with regular client:", profileError)
            }
          }
        } catch (profileError) {
          console.error("Error creating profile:", profileError)
          // Continue anyway - the auth part succeeded
        }
      }

      return NextResponse.json({ user: data.user })
    }

    if (action === "signout") {
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error("Sign out error:", error.message)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("Auth API error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Update the GET method to use the admin client for profile operations
export async function GET(request: Request) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options, maxAge: 60 * 60 * 24 * 30 })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 })
        },
      },
    },
  )

  // Create admin client for operations that need to bypass RLS
  const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options, maxAge: 60 * 60 * 24 * 30 })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 })
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null

  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error("Session fetch error:", error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data.session) {
      return NextResponse.json({ user: null })
    }

    // Get user profile data - first try with regular client
    let profile = null
    let profileError = null

    try {
      const result = await supabase.from("profiles").select("*").eq("id", data.session.user.id).single()

      profile = result.data
      profileError = result.error
    } catch (err) {
      console.error("Error fetching profile:", err)
      profileError = { message: "Failed to fetch profile" }
    }

    // If there was an error and it's "not found", try to create the profile
    if (profileError && profileError.code === "PGRST116") {
      // Profile not found, create one
      try {
        let profileCreated = false

        // Try with admin client first if available
        if (adminClient) {
          const { data: newProfile, error: insertError } = await adminClient
            .from("profiles")
            .insert({
              id: data.session.user.id,
              full_name: data.session.user.user_metadata?.full_name || data.session.user.email?.split("@")[0] || "User",
              email: data.session.user.email || "",
              role: "user",
            })
            .select()
            .single()

          if (insertError) {
            console.error("Profile creation error with admin client:", insertError.message)
          } else {
            profile = newProfile
            profileCreated = true
          }
        }

        // Fallback to regular client if admin client failed or isn't available
        if (!profileCreated) {
          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: data.session.user.id,
              full_name: data.session.user.user_metadata?.full_name || data.session.user.email?.split("@")[0] || "User",
              email: data.session.user.email || "",
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
      } catch (createError: any) {
        console.error("Error creating profile:", createError.message)
      }

      // Return user data even if profile creation had an error
      if (!profile) {
        return NextResponse.json({
          user: {
            id: data.session.user.id,
            email: data.session.user.email,
            fullName: data.session.user.user_metadata?.full_name || data.session.user.email?.split("@")[0] || "User",
            role: "user",
            avatarUrl: null,
          },
        })
      }
    } else if (profileError) {
      console.error("Profile fetch error:", profileError)
      // Return user data with basic info even if profile fetch failed
      return NextResponse.json({
        user: {
          id: data.session.user.id,
          email: data.session.user.email,
          fullName: data.session.user.user_metadata?.full_name || "User",
          role: "user",
          avatarUrl: null,
        },
      })
    }

    return NextResponse.json({
      user: {
        id: data.session.user.id,
        email: data.session.user.email,
        fullName: profile?.full_name || data.session.user.user_metadata?.full_name || "User",
        role: profile?.role || "user",
        avatarUrl: profile?.avatar_url,
      },
    })
  } catch (error: any) {
    console.error("Auth GET error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
