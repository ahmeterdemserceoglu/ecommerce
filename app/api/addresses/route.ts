import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data: session, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session.session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.session.user.id

    const { data: addresses, error } = await supabase
      .from("user_addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching addresses:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ addresses })
  } catch (error: any) {
    console.error("Addresses API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data: session, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session.session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.session.user.id
    const addressData = await request.json()

    // Kullanıcı ID'sini ekle
    addressData.user_id = userId

    // Eğer bu ilk adres ise, varsayılan olarak ayarla
    if (addressData.is_default === undefined) {
      const { count, error: countError } = await supabase
        .from("user_addresses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("address_type", addressData.address_type || "shipping")

      if (!countError && count === 0) {
        addressData.is_default = true
      }
    }

    const { data, error } = await supabase.from("user_addresses").insert(addressData).select().single()

    if (error) {
      console.error("Error creating address:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ address: data })
  } catch (error: any) {
    console.error("Addresses API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data: session, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session.session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.session.user.id
    const { id, ...addressData } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Address ID is required" }, { status: 400 })
    }

    // Kullanıcının bu adresi değiştirme yetkisi var mı kontrol et
    const { data: existingAddress, error: fetchError } = await supabase
      .from("user_addresses")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (fetchError || !existingAddress) {
      return NextResponse.json({ error: "Address not found or not authorized" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("user_addresses")
      .update(addressData)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      console.error("Error updating address:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ address: data })
  } catch (error: any) {
    console.error("Addresses API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Address ID is required" }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data: session, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session.session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.session.user.id

    // Kullanıcının bu adresi silme yetkisi var mı kontrol et
    const { data: existingAddress, error: fetchError } = await supabase
      .from("user_addresses")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (fetchError || !existingAddress) {
      return NextResponse.json({ error: "Address not found or not authorized" }, { status: 404 })
    }

    const { error } = await supabase.from("user_addresses").delete().eq("id", id).eq("user_id", userId)

    if (error) {
      console.error("Error deleting address:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Addresses API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
