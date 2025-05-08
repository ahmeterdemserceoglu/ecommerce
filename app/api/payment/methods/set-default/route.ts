import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    // Normal istemci ile kullanıcı oturumunu kontrol et
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor" }, { status: 401 })
    }

    const userId = session.user.id
    const cardId = request.nextUrl.searchParams.get("cardId")

    if (!cardId) {
      return NextResponse.json({ error: "Kart ID'si gereklidir" }, { status: 400 })
    }

    try {
      // Admin istemcisini oluştur
      const adminClient = createAdminClient()

      if (!adminClient) {
        console.error("Admin istemcisi oluşturulamadı - SUPABASE_SERVICE_ROLE_KEY eksik olabilir")
        return NextResponse.json(
          {
            error: "Sistem yapılandırma hatası. Lütfen yönetici ile iletişime geçin.",
          },
          { status: 500 },
        )
      }

      // Önce tüm kartları varsayılan olmaktan çıkar
      const { error: updateError } = await adminClient
        .from("card_tokens")
        .update({ is_default: false })
        .eq("user_id", userId)

      if (updateError) {
        console.error("Kartlar güncellenirken hata:", updateError)
        return NextResponse.json({ error: "Varsayılan kart ayarlanamadı" }, { status: 500 })
      }

      // Seçilen kartı varsayılan yap
      const { error: setDefaultError } = await adminClient
        .from("card_tokens")
        .update({ is_default: true })
        .eq("id", cardId)
        .eq("user_id", userId)

      if (setDefaultError) {
        console.error("Varsayılan kart ayarlanırken hata:", setDefaultError)
        return NextResponse.json({ error: "Varsayılan kart ayarlanamadı" }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    } catch (dbError) {
      console.error("Veritabanı hatası:", dbError)
      return NextResponse.json({ error: "Varsayılan kart ayarlanamadı" }, { status: 500 })
    }
  } catch (error) {
    console.error("Beklenmeyen hata:", error)
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 })
  }
}
