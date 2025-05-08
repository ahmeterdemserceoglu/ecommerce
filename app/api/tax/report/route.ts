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

    // Satıcı bilgilerini kontrol et
    const { data: seller, error: sellerError } = await supabase
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

    // URL parametrelerini al
    const url = new URL(request.url)
    const year = Number.parseInt(url.searchParams.get("year") || new Date().getFullYear().toString())
    const month = Number.parseInt(url.searchParams.get("month") || (new Date().getMonth() + 1).toString())

    const taxService = new TaxService()

    // Vergi raporunu oluştur
    const report = await taxService.generateMonthlyTaxReport({
      sellerId: seller.id,
      year,
      month,
    })

    return NextResponse.json({
      success: true,
      report,
    })
  } catch (error: any) {
    console.error("Tax report error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Vergi raporu oluşturulurken bir hata oluştu",
      },
      { status: 500 },
    )
  }
}
