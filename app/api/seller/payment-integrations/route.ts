import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  // Check if user is authenticated and is a seller
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get the store for this seller
  const { data: store, error: storeError } = await supabase.from("stores").select("id").eq("user_id", user.id).single()

  if (storeError || !store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 })
  }

  // Get payment integrations for this store
  const { data: integrations, error } = await supabase.from("payment_integrations").select("*").eq("store_id", store.id)

  if (error) {
    return NextResponse.json({ error: "Failed to fetch payment integrations" }, { status: 500 })
  }

  return NextResponse.json({ integrations })
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  // Check if user is authenticated and is a seller
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get the store for this seller
  const { data: store, error: storeError } = await supabase.from("stores").select("id").eq("user_id", user.id).single()

  if (storeError || !store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 })
  }

  try {
    const body = await request.json()
    const { provider, config, is_active } = body

    // Validate required fields
    if (!provider) {
      return NextResponse.json({ error: "Provider is required" }, { status: 400 })
    }

    if (!config) {
      return NextResponse.json({ error: "Configuration is required" }, { status: 400 })
    }

    // Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from("payment_integrations")
      .select("id")
      .eq("store_id", store.id)
      .eq("provider", provider)
      .single()

    if (existingIntegration) {
      // Update existing integration
      const { error } = await supabase
        .from("payment_integrations")
        .update({
          config,
          is_active: is_active !== undefined ? is_active : true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingIntegration.id)

      if (error) {
        return NextResponse.json({ error: "Failed to update payment integration" }, { status: 500 })
      }

      return NextResponse.json({ message: "Payment integration updated successfully" })
    } else {
      // Create new integration
      const { error } = await supabase.from("payment_integrations").insert({
        store_id: store.id,
        provider,
        config,
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (error) {
        return NextResponse.json({ error: "Failed to create payment integration" }, { status: 500 })
      }

      return NextResponse.json({ message: "Payment integration created successfully" })
    }
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const id = url.searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Integration ID is required" }, { status: 400 })
  }

  const supabase = createRouteHandlerClient({ cookies })

  // Check if user is authenticated and is a seller
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get the store for this seller
  const { data: store, error: storeError } = await supabase.from("stores").select("id").eq("user_id", user.id).single()

  if (storeError || !store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 })
  }

  // Verify the integration belongs to this store
  const { data: integration, error: integrationError } = await supabase
    .from("payment_integrations")
    .select("id")
    .eq("id", id)
    .eq("store_id", store.id)
    .single()

  if (integrationError || !integration) {
    return NextResponse.json({ error: "Integration not found or access denied" }, { status: 404 })
  }

  // Delete the integration
  const { error } = await supabase.from("payment_integrations").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: "Failed to delete payment integration" }, { status: 500 })
  }

  return NextResponse.json({ message: "Payment integration deleted successfully" })
}
