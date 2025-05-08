import { type NextRequest, NextResponse } from "next/server"
import { TaxService } from "@/lib/tax/tax-service"
import { getUser } from "@/lib/utils"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Oturum açmanız gerekiyor",
        },
        { status: 401 },
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    )

    // Kullanıcının admin olup olmadığını kontrol et
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || profile.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Bu işlem için yetkiniz yok",
        },
        { status: 403 },
      )
    }

    const taxService = new TaxService()

    // Vergi ayarlarını al
    const taxSettings = await taxService.getTaxSettings()

    return NextResponse.json({
      success: true,
      taxSettings,
    })
  } catch (error: any) {
    console.error("Tax settings error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Vergi ayarları alınırken bir hata oluştu",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Oturum açmanız gerekiyor",
        },
        { status: 401 },
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    )

    // Kullanıcının admin olup olmadığını kontrol et
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || profile.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Bu işlem için yetkiniz yok",
        },
        { status: 403 },
      )
    }

    const body = await request.json()

    // Gerekli alanları kontrol et
    if (!body.name || !body.type || body.rate === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: "Ad, tür ve oran alanları gereklidir",
        },
        { status: 400 },
      )
    }

    const taxService = new TaxService()

    // Vergi ayarı oluştur
    const taxSetting = await taxService.createTaxSetting({
      name: body.name,
      type: body.type,
      rate: body.rate,
      appliesTo: body.appliesTo || "ALL",
      categoryIds: body.categoryIds,
      sellerTypes: body.sellerTypes,
    })

    return NextResponse.json({
      success: true,
      taxSetting,
    })
  } catch (error: any) {
    console.error("Tax setting creation error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Vergi ayarı oluşturulurken bir hata oluştu",
      },
      { status: 500 },
    )
  }
}
