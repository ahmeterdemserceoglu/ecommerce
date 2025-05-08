import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 401 })
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    )

    // Satıcı bilgilerini kontrol et
    const { data: seller, error: sellerError } = await supabaseClient
      .from("sellers")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (sellerError) {
      return NextResponse.json(
        {
          success: false,
          message: "Satıcı bilgileri bulunamadı",
        },
        { status: 404 },
      )
    }

    // Fatura ayarlarını al
    const { data: invoiceSettings, error: invoiceError } = await supabaseClient
      .from("invoice_settings")
      .select("*")
      .eq("seller_id", seller.id)
      .single()

    // Banka hesaplarını al
    const { data: bankAccounts, error: bankError } = await supabaseClient
      .from("seller_bank_accounts")
      .select("*")
      .eq("seller_id", seller.id)
      .order("is_default", { ascending: false })

    // Ödeme entegrasyonlarını al
    const { data: paymentIntegrations, error: integrationsError } = await supabaseClient
      .from("seller_payment_integrations")
      .select("*")
      .eq("seller_id", seller.id)

    return NextResponse.json({
      success: true,
      invoiceSettings: invoiceSettings || null,
      bankAccounts: bankAccounts || [],
      paymentIntegrations: paymentIntegrations || [],
    })
  } catch (error: any) {
    console.error("Payment settings error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Ödeme ayarları alınırken bir hata oluştu",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 401 })
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    )

    // Satıcı bilgilerini kontrol et
    const { data: seller, error: sellerError } = await supabaseClient
      .from("sellers")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (sellerError) {
      return NextResponse.json(
        {
          success: false,
          message: "Satıcı bilgileri bulunamadı",
        },
        { status: 404 },
      )
    }

    const body = await request.json()
    const { type, data } = body

    if (type === "invoice_settings") {
      // Fatura ayarlarını güncelle veya oluştur
      const { data: existingSettings } = await supabaseClient
        .from("invoice_settings")
        .select("id")
        .eq("seller_id", seller.id)
        .maybeSingle()

      if (existingSettings) {
        // Mevcut ayarları güncelle
        await supabaseClient
          .from("invoice_settings")
          .update({
            is_e_invoice_user: data.isEInvoiceUser,
            tax_office: data.taxOffice,
            tax_number: data.taxNumber,
            company_name: data.companyName,
            address: data.address,
            phone: data.phone,
            email: data.email,
            mersis: data.mersis,
            gib_username: data.gibUsername,
            gib_password: data.gibPassword,
            gib_api_key: data.gibApiKey,
            auto_invoice_generation: data.autoInvoiceGeneration,
            invoice_prefix: data.invoicePrefix,
            invoice_notes: data.invoiceNotes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSettings.id)
      } else {
        // Yeni ayarlar oluştur
        await supabaseClient.from("invoice_settings").insert({
          seller_id: seller.id,
          is_e_invoice_user: data.isEInvoiceUser,
          tax_office: data.taxOffice,
          tax_number: data.taxNumber,
          company_name: data.companyName,
          address: data.address,
          phone: data.phone,
          email: data.email,
          mersis: data.mersis,
          gib_username: data.gibUsername,
          gib_password: data.gibPassword,
          gib_api_key: data.gibApiKey,
          auto_invoice_generation: data.autoInvoiceGeneration,
          invoice_prefix: data.invoicePrefix || "INV",
          invoice_notes: data.invoiceNotes,
        })
      }

      return NextResponse.json({ success: true, message: "Fatura ayarları güncellendi" })
    } else if (type === "bank_account") {
      // Banka hesabı ekle
      await supabaseClient.from("seller_bank_accounts").insert({
        seller_id: seller.id,
        bank_name: data.bankName,
        account_holder_name: data.accountHolderName,
        iban: data.iban,
        is_default: data.isDefault || false,
      })

      // Eğer varsayılan olarak işaretlendiyse diğer hesapları güncelle
      if (data.isDefault) {
        await supabaseClient
          .from("seller_bank_accounts")
          .update({ is_default: false })
          .eq("seller_id", seller.id)
          .neq("iban", data.iban)
      }

      return NextResponse.json({ success: true, message: "Banka hesabı eklendi" })
    } else if (type === "payment_integration") {
      // Ödeme entegrasyonu ekle/güncelle
      const { data: existingIntegration } = await supabaseClient
        .from("seller_payment_integrations")
        .select("id")
        .eq("seller_id", seller.id)
        .eq("provider", data.provider)
        .maybeSingle()

      if (existingIntegration) {
        // Mevcut entegrasyonu güncelle
        await supabaseClient
          .from("seller_payment_integrations")
          .update({
            api_key: data.apiKey,
            api_secret: data.apiSecret,
            merchant_id: data.merchantId,
            is_active: data.isActive,
            settings: data.settings,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingIntegration.id)
      } else {
        // Yeni entegrasyon oluştur
        await supabaseClient.from("seller_payment_integrations").insert({
          seller_id: seller.id,
          provider: data.provider,
          api_key: data.apiKey,
          api_secret: data.apiSecret,
          merchant_id: data.merchantId,
          is_active: data.isActive,
          settings: data.settings,
        })
      }

      return NextResponse.json({ success: true, message: "Ödeme entegrasyonu güncellendi" })
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Geçersiz işlem tipi",
        },
        { status: 400 },
      )
    }
  } catch (error: any) {
    console.error("Payment settings update error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Ödeme ayarları güncellenirken bir hata oluştu",
      },
      { status: 500 },
    )
  }
}
