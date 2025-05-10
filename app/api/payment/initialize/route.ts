import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { PaymentService } from "@/lib/payment/payment-service.server"
import { v4 as uuidv4 } from 'uuid'; // For generating a temporary transaction reference

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const body = await request.json()
    const {
      userId,
      amount,
      currency = "TRY",
      paymentMethod,
      cardNumber,
      cardHolderName,
      expiryMonth,
      expiryYear,
      cvv,
      savedCardId,
      bankId,
      installmentCount = 1,
      use3DSecure = true,
      returnUrl,
      cartItems,
      customer,
      billingAddress,
      shippingAddress
    } = body

    // Gerekli alanları kontrol et
    const missingFields = []
    if (!userId) missingFields.push('userId')
    if (!amount) missingFields.push('amount')
    if (!paymentMethod) missingFields.push('paymentMethod')
    if (!bankId) missingFields.push('bankId')
    if (!cartItems || cartItems.length === 0) missingFields.push('cartItems')
    if (!customer) missingFields.push('customer')
    if (!billingAddress) missingFields.push('billingAddress')
    if (!shippingAddress) missingFields.push('shippingAddress')

    if (missingFields.length > 0) {
      return NextResponse.json({ error: `Eksik alanlar: ${missingFields.join(', ')}` }, { status: 400 })
    }

    if (!savedCardId && (!cardNumber || !cardHolderName || !expiryMonth || !expiryYear || !cvv)) {
      const cardMissing = []
      if (!cardNumber) cardMissing.push('cardNumber')
      if (!cardHolderName) cardMissing.push('cardHolderName')
      if (!expiryMonth) cardMissing.push('expiryMonth')
      if (!expiryYear) cardMissing.push('expiryYear')
      if (!cvv) cardMissing.push('cvv')
      return NextResponse.json({ error: `Eksik kart alanları: ${cardMissing.join(', ')}` }, { status: 400 })
    }

    const paymentService = new PaymentService()
    const ipAddress = request.headers.get("x-forwarded-for")?.split(',')[0].trim() || request.headers.get("remote-addr") || "127.0.0.1"
    const userAgent = request.headers.get("user-agent") || ""

    // Benzersiz bir işlem referansı oluştur (bu webhook'ta siparişi eşleştirmek için kullanılabilir)
    const paymentConversationId = uuidv4();

    // Ziraat Bankası için özel yönlendirme (Bu kısım olduğu gibi kalabilir, ancak conversationId/basketId göndermesi gerekebilir)
    if (bankId && typeof bankId === "string") {
      const { data: bank } = await supabase.from("banks").select("id, name").eq("id", bankId).single()
      if (bank && bank.name && bank.name.toLowerCase().includes("ziraat")) {
        const htmlForm = `
          <form id='ziraatForm' action='https://sanalpos.ziraatbank.com.tr/fim/est3dgate' method='POST'>
            <input type='hidden' name='clientid' value='TESTCLIENTID' /> 
            <input type='hidden' name='amount' value='${amount}' />
            <input type='hidden' name='oid' value='${paymentConversationId}' /> {/* Using conversationId as Order ID for Ziraat example */}
            <input type='hidden' name='okUrl' value='${returnUrl || `${request.headers.get("origin")}/odeme/sonuc?status=success&ref=${paymentConversationId}`}' />
            <input type='hidden' name='failUrl' value='${returnUrl || `${request.headers.get("origin")}/odeme/sonuc?status=fail&ref=${paymentConversationId}`}' />
            <input type='hidden' name='rnd' value='${Math.random()}' />
            <input type='hidden' name='islemtipi' value='Auth' />
            <input type='hidden' name='taksit' value='${installmentCount === 1 ? "" : installmentCount}' />
            <input type='hidden' name='currency' value='949' />
            <input type='hidden' name='lang' value='tr' />
            <input type='hidden' name='storetype' value='3d_pay_hosting' />
            {/* Diğer Ziraat'a özel alanlar (pan, expDate, cvv, cardHolderName) güvenli bir şekilde backend'den alınmalı veya tokenizasyon kullanılmalı */}
            <input type='hidden' name='pan' value='${cardNumber?.replace(/\s/g, "") || ""}' />
            <input type='hidden' name='Ecom_Payment_Card_ExpDate_Month' value='${expiryMonth || ""}' />
            <input type='hidden' name='Ecom_Payment_Card_ExpDate_Year' value='${expiryYear?.slice(-2) || ""}' />
            <input type='hidden' name='cv2' value='${cvv || ""}' />
            <input type='hidden' name='cardHolderName' value='${cardHolderName || ""}' />
            <input type='hidden' name='clientIp' value='${ipAddress}' />
            <script>document.getElementById('ziraatForm').submit();</script>
          </form>
        `
        return NextResponse.json({
          success: true,
          htmlContent: htmlForm, // Client'a HTML content olarak gönderiyoruz
          paymentConversationId: paymentConversationId,
        })
      }
    }

    // PaymentService.initiatePayment çağrısını yeni yapıya göre güncelle
    const paymentResult = await paymentService.initiatePayment({
      paymentConversationId, // Bu ID'yi ödeme sağlayıcısına metadata olarak gönder
      userId,
      amount,
      currency,
      paymentMethod,
      cardNumber,
      cardHolderName,
      expiryMonth,
      expiryYear,
      cvv,
      savedCardId,
      bankId,
      installmentCount,
      use3DSecure,
      returnUrl: returnUrl || `${request.headers.get("origin")}/odeme/sonuc?ref=${paymentConversationId}`,
      ipAddress,
      userAgent,
      cartItems, // Ödeme sağlayıcısının beklediği formatta ürünler
      customer,  // Müşteri bilgileri
      billingAddress, // Fatura adresi
      shippingAddress // Teslimat adresi
    })

    if (!paymentResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: paymentResult.errorMessage || "Ödeme başlatılamadı",
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      transactionId: paymentResult.transactionId,
      redirectUrl: paymentResult.redirectUrl,
      htmlContent: paymentResult.htmlContent,
      paymentConversationId: paymentConversationId,
    })

  } catch (error: any) {
    console.error("Payment initialization error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Payment initialization failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
