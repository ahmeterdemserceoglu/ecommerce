import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase-admin"

// Update the GET method to fix the response structure
export async function GET(request: NextRequest) {
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

    try {
      // Admin istemcisini oluştur
      const adminClient = createAdminClient()

      if (!adminClient) {
        console.error("Admin istemcisi oluşturulamadı - SUPABASE_SERVICE_ROLE_KEY eksik olabilir")
        return NextResponse.json({
          savedCards: [],
          error: "Sistem yapılandırma hatası. Lütfen yönetici ile iletişime geçin.",
        })
      }

      // Kullanıcının kayıtlı kartlarını getir
      const { data: cards, error } = await adminClient
        .from("card_tokens")
        .select(`
    id, 
    card_holder_name, 
    last_four_digits, 
    card_type, 
    expiry_month, 
    expiry_year, 
    is_default,
    bank_id
  `)
        .eq("user_id", userId)
        .order("is_default", { ascending: false })

      if (error) {
        console.error("Admin istemcisi ile kartlar yüklenirken hata:", error)

        // Hata durumunda boş bir dizi döndür
        return NextResponse.json({
          savedCards: [],
          error: "Kartlar yüklenemedi, lütfen daha sonra tekrar deneyin",
        })
      }

      // Bankaları getir
      const { data: banks, error: banksError } = await adminClient
        .from("banks")
        .select("id, name, logo, supported_card_types, installment_options")
        .eq("is_active", true)
        .order("name", { ascending: true })

      if (banksError) {
        console.error("Bankalar yüklenirken hata:", banksError)
      }

      // Transform the data to match the expected format in the client
      const savedCards =
        cards?.map((card) => ({
          id: card.id,
          cardHolderName: card.card_holder_name,
          lastFourDigits: card.last_four_digits,
          cardType: card.card_type,
          expiryMonth: card.expiry_month,
          expiryYear: card.expiry_year,
          isDefault: card.is_default,
          bankId: card.bank_id,
        })) || []

      return NextResponse.json({ savedCards, banks: banks || [] })
    } catch (dbError) {
      console.error("Veritabanı hatası:", dbError)

      // Hata durumunda boş bir dizi döndür
      return NextResponse.json({
        savedCards: [],
        error: "Kartlar yüklenemedi, lütfen daha sonra tekrar deneyin",
      })
    }
  } catch (error) {
    console.error("Beklenmeyen hata:", error)
    return NextResponse.json({
      savedCards: [],
      error: "Bir hata oluştu, lütfen daha sonra tekrar deneyin",
    })
  }
}

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

    const body = await request.json()
    const { cardHolderName, cardNumber, expiryMonth, expiryYear, cardType, bankId, makeDefault } = body
    const userId = session.user.id

    // Kart numarasının son 4 hanesini al
    const lastFourDigits = cardNumber.slice(-4)

    // Kart tokenı oluştur
    const tokenValue = `token_${Math.random().toString(36).substring(2, 15)}`

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

      // Eğer varsayılan kart olarak ayarlanacaksa, önce diğer tüm kartları varsayılan olmaktan çıkar
      if (makeDefault) {
        await adminClient.from("card_tokens").update({ is_default: false }).eq("user_id", userId)
      }

      // Kartı kaydet
      const { data, error } = await adminClient
        .from("card_tokens")
        .insert({
          user_id: userId,
          card_holder_name: cardHolderName,
          last_four_digits: lastFourDigits,
          expiry_month: expiryMonth,
          expiry_year: expiryYear,
          card_type: cardType,
          bank_id: bankId,
          token_value: tokenValue,
          is_default: makeDefault || false,
        })
        .select()

      if (error) {
        console.error("Kart kaydedilirken hata:", error)
        console.error("Insert edilen veri:", {
          user_id: userId,
          card_holder_name: cardHolderName,
          last_four_digits: lastFourDigits,
          expiry_month: expiryMonth,
          expiry_year: expiryYear,
          card_type: cardType,
          bank_id: bankId,
          token_value: tokenValue,
          is_default: makeDefault || false,
        })
        return NextResponse.json({ error: error.message || "Kart kaydedilemedi", details: error }, { status: 500 })
      }

      return NextResponse.json({ success: true, card: data?.[0] || null })
    } catch (dbError) {
      console.error("Veritabanı hatası:", dbError)
      return NextResponse.json({ error: "Kart kaydedilemedi" }, { status: 500 })
    }
  } catch (error) {
    console.error("Beklenmeyen hata:", error)
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 })
  }
}
