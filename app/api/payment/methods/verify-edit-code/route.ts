import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  try {
    const body = await request.json()
    const { cardId, code } = body
    if (!cardId || !code) {
      return NextResponse.json({ error: "Eksik parametre" }, { status: 400 })
    }
    // Kullanıcıyı al
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ error: "Kullanıcı doğrulanamadı" }, { status: 401 })
    }
    // Debug log: parametreler
    console.log("DEBUG verify-edit-code:", { user_id: user.id, card_id: cardId, code })
    // Kod kaydını bul
    const { data: record, error: recError } = await supabase
      .from("card_edit_verifications")
      .select("id, used, expires_at, user_id, card_id, code")
      .eq("user_id", user.id)
      .eq("card_id", cardId)
      .eq("code", code)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    // Debug log: sorgu sonucu
    console.log("DEBUG verify-edit-code result:", { record, recError })
    if (recError || !record) {
      return NextResponse.json({ error: "Kod bulunamadı veya yanlış" }, { status: 400 })
    }
    if (record.used) {
      return NextResponse.json({ error: "Kod zaten kullanılmış" }, { status: 400 })
    }
    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: "Kodun süresi dolmuş" }, { status: 400 })
    }
    // Kullanıldı olarak işaretle
    await supabase.from("card_edit_verifications").update({ used: true }).eq("id", record.id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
} 