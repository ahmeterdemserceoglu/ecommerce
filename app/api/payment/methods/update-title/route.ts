import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function PATCH(request: Request) {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  try {
    const body = await request.json()
    const { cardId, title } = body
    if (!cardId || typeof title !== "string") {
      return NextResponse.json({ error: "Eksik parametre" }, { status: 400 })
    }
    // Kullanıcıyı al
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ error: "Kullanıcı doğrulanamadı" }, { status: 401 })
    }
    // Kart gerçekten kullanıcıya mı ait?
    const { data: card, error: cardError } = await supabase
      .from("card_tokens")
      .select("id, user_id")
      .eq("id", cardId)
      .single()
    if (cardError || !card) {
      return NextResponse.json({ error: "Kart bulunamadı" }, { status: 404 })
    }
    if (card.user_id !== user.id) {
      return NextResponse.json({ error: "Bu karta erişim yetkiniz yok" }, { status: 403 })
    }
    // Kart başlığını güncelle
    const { error: updateError } = await supabase
      .from("card_tokens")
      .update({ title })
      .eq("id", cardId)
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
} 