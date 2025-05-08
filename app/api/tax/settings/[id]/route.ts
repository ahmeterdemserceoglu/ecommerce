import { type NextRequest, NextResponse } from "next/server"
import { TaxService } from "@/lib/tax/tax-service"
import { createClient } from "@supabase/supabase-js"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
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
    const taxService = new TaxService()

    // Vergi ayarını güncelle
    await taxService.updateTaxSetting(params.id, {
      name: body.name,
      rate: body.rate,
      isActive: body.isActive,
      appliesTo: body.appliesTo,
      categoryIds: body.categoryIds,
      sellerTypes: body.sellerTypes,
    })

    return NextResponse.json({
      success: true,
      message: "Vergi ayarı güncellendi",
    })
  } catch (error: any) {
    console.error("Tax setting update error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Vergi ayarı güncellenirken bir hata oluştu",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
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

    // Vergi ayarını sil
    await taxService.deleteTaxSetting(params.id)

    return NextResponse.json({
      success: true,
      message: "Vergi ayarı silindi",
    })
  } catch (error: any) {
    console.error("Tax setting delete error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Vergi ayarı silinirken bir hata oluştu",
      },
      { status: 500 },
    )
  }
}
