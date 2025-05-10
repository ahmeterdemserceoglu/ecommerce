import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { PaymentService } from "@/lib/payment/payment-service.server"

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const body = await request.json()
    const { transactionId, paymentId, status, bankResponseData } = body

    // Gerekli alanları kontrol et
    if (!transactionId || !paymentId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Ödeme işlemini doğrula
    const paymentService = new PaymentService()
    const result = await paymentService.complete3DSecurePayment({
      transactionId,
      paymentId,
      status,
      bankResponseData,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.errorMessage,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
    })
  } catch (error: any) {
    console.error("Payment completion error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Payment completion failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
