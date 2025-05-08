import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// Update the route handler to better handle authentication and add more robust error handling

export async function POST(request: Request) {
  const cookieStore = cookies()

  try {
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("Auth error in create-cart route:", authError)
      return NextResponse.json({ error: "Authentication error", message: authError.message }, { status: 401 })
    }

    if (!user) {
      console.error("No user found in create-cart route")
      return NextResponse.json(
        { error: "Unauthorized", message: "You must be logged in to create a cart" },
        { status: 401 },
      )
    }

    console.log("Creating cart for user:", user.id)

    // First check if user already has a cart
    const { data: existingCart, error: checkError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!checkError && existingCart) {
      console.log("Existing cart found:", existingCart.id)
      return NextResponse.json({ id: existingCart.id })
    }

    // Try direct insert with security_definer function if available
    try {
      const { data, error } = await supabase.rpc("create_cart_for_user", {
        user_uuid: user.id,
      })

      if (!error && data) {
        console.log("Cart created with RPC function:", data)
        return NextResponse.json({ id: data })
      }

      if (error) {
        console.error("RPC error:", error)
      }
    } catch (rpcError) {
      console.log("RPC function not available, falling back to direct insert")
    }

    // Fallback: Try direct insert with admin privileges
    try {
      // Create a new client with admin privileges if service role key is available
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const adminClient = createRouteHandlerClient({
          cookies: () => cookieStore,
          options: {
            db: { schema: "public" },
            auth: {
              persistSession: false,
            },
            global: {
              headers: {
                Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              },
            },
          },
        })

        const { data: cartData, error: insertError } = await adminClient
          .from("carts")
          .insert({ user_id: user.id })
          .select("id")
          .single()

        if (insertError) {
          console.error("Error creating cart with admin client:", insertError)
          throw insertError
        }

        console.log("Cart created with admin client:", cartData.id)
        return NextResponse.json({ id: cartData.id })
      } else {
        // Last resort: try direct insert with regular client
        const { data: cartData, error: insertError } = await supabase
          .from("carts")
          .insert({ user_id: user.id })
          .select("id")
          .single()

        if (insertError) {
          console.error("Error creating cart with regular client:", insertError)
          throw insertError
        }

        console.log("Cart created with regular client:", cartData.id)
        return NextResponse.json({ id: cartData.id })
      }
    } catch (insertError: any) {
      console.error("Failed to create cart:", insertError)
      return NextResponse.json({ error: "Failed to create cart", message: insertError.message }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Unexpected error in create-cart route:", error)
    return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 })
  }
}
