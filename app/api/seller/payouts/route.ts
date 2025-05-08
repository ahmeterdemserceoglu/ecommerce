import { type NextRequest, NextResponse } from "next/server"
import { PayoutService } from "@/lib/seller/payout-service"
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 401 })
    }

    const payoutService = new PayoutService()

    // Ödeme özetini al
    const summary = await payoutService.getSellerPaymentSummary(user.id)

    // Ödeme geçmişini al
    const history = await payoutService.getSellerPayoutHistory(user.id)

    return NextResponse.json({
      success: true,
      summary,
      history,
    })
  } catch (error: any) {
    console.error("Payouts error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Ödeme bilgileri alınırken bir hata oluştu",
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

    const payoutService = new PayoutService()

    const body = await request.json()

    // Ödeme işlemi oluştur
    const payout = await payoutService.createSellerPayout({
      sellerId: user.id,
      amount: body.amount,
      bankAccountId: body.bankAccountId,
      iban: body.iban || null,
      description: body.description || "Satıcı ödemesi",
    })

    return NextResponse.json({
      success: true,
      payoutId: payout.id,
      status: payout.status,
    })
  } catch (error: any) {
    console.error("Payout creation error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Ödeme işlemi oluşturulurken bir hata oluştu",
      },
      { status: 500 },
    )
  }
}
