import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function PATCH(request: Request) {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  try {
    const body = await request.json()
    const { cardId, card_holder_name, expiry_month, expiry_year, title, card_number, cvv } = body
    if (!cardId) {
      return NextResponse.json({ error: "Eksik kart ID" }, { status: 400 })
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
    // Güncellenecek alanları hazırla
    const updateFields: any = {}
    let missingFields: string[] = []
    if (typeof card_holder_name === "string" && card_holder_name.trim() !== "") updateFields.card_holder_name = card_holder_name
    else missingFields.push("Kart Sahibi Adı")
    if ((typeof expiry_month === "string" || typeof expiry_month === "number") && expiry_month) updateFields.expiry_month = expiry_month
    else missingFields.push("Son Kullanma Ayı")
    if ((typeof expiry_year === "string" || typeof expiry_year === "number") && expiry_year) updateFields.expiry_year = expiry_year
    else missingFields.push("Son Kullanma Yılı")
    if (typeof title === "string" && title.trim() !== "") updateFields.title = title
    else missingFields.push("Kart Başlığı")
    if (typeof card_number === "string" && card_number.trim() !== "") updateFields.card_number = card_number
    else missingFields.push("Kart Numarası")
    if (typeof cvv === "string" && cvv.trim() !== "") updateFields.cvv = cvv
    else missingFields.push("CVV")
    if (missingFields.length > 0) {
      return NextResponse.json({ error: `Eksik veya hatalı alanlar: ${missingFields.join(", ")}` }, { status: 400 })
    }
    // Debug: Güncellenmek istenen alanlar ve user/card bilgisi
    console.log("DEBUG UPDATE", { user_id: user.id, card_id: cardId, updateFields })
    // Kartı güncelle
    const { error: updateError } = await supabase
      .from("card_tokens")
      .update(updateFields)
      .eq("id", cardId)
    if (updateError) {
      // Policy/izin hatası veya sütun eksikliği için özel kontrol
      let extra = ""
      if (updateError.message.includes("permission denied")) {
        extra = "Muhtemelen Supabase policy/izin eksikliği. Kullanıcı kendi kartını güncelleyebiliyor mu kontrol et."
      } else if (updateError.message.includes("column") && updateError.message.includes("does not exist")) {
        extra = "Tabloda eksik sütun olabilir. Tablonun şemasını kontrol et."
      }
      return NextResponse.json({ error: `Supabase güncelleme hatası: ${updateError.message}. ${extra}`, debug: { user_id: user.id, card_id: cardId, updateFields } }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
} 