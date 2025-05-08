import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { PaymentService } from "@/lib/payment/payment-service"

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const body = await request.json()
    const {
      orderId,
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
    } = body

    // Gerekli alanları kontrol et
    const missingFields = []
    if (!userId) missingFields.push('userId')
    if (!amount) missingFields.push('amount')
    if (!paymentMethod) missingFields.push('paymentMethod')
    if (!bankId) missingFields.push('bankId')
    if (missingFields.length > 0) {
      return NextResponse.json({ error: `Eksik alanlar: ${missingFields.join(', ')}` }, { status: 400 })
    }

    // Kart bilgilerini veya kayıtlı kart ID'sini kontrol et
    if (!savedCardId && (!cardNumber || !cardHolderName || !expiryMonth || !expiryYear || !cvv)) {
      const cardMissing = []
      if (!cardNumber) cardMissing.push('cardNumber')
      if (!cardHolderName) cardMissing.push('cardHolderName')
      if (!expiryMonth) cardMissing.push('expiryMonth')
      if (!expiryYear) cardMissing.push('expiryYear')
      if (!cvv) cardMissing.push('cvv')
      return NextResponse.json({ error: `Eksik kart alanları: ${cardMissing.join(', ')}` }, { status: 400 })
    }

    // Eğer orderId varsa, siparişin varlığını ve kullanıcıya ait olduğunu doğrula
    let order = null
    if (orderId) {
      const { data: foundOrder, error: orderError } = await supabase
        .from("orders")
        .select("id, store_id, total_amount, status")
        .eq("id", orderId)
        .eq("user_id", userId)
        .single()
      if (orderError || !foundOrder) {
        return NextResponse.json({ error: "Order not found or not authorized" }, { status: 404 })
      }
      order = foundOrder
      // Sipariş tutarı ile gönderilen tutarın eşleştiğini kontrol et
      if (order.total_amount !== amount) {
        return NextResponse.json({ error: "Amount mismatch" }, { status: 400 })
      }
      // Sipariş durumunu kontrol et
      if (order.status === "paid" || order.status === "completed") {
        return NextResponse.json({ error: "Order is already paid" }, { status: 400 })
      }
    }

    // Ödeme servisini başlat
    const paymentService = new PaymentService()
    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1"
    const userAgent = request.headers.get("user-agent") || ""

    // Ziraat Bankası için özel yönlendirme (gerçek POS formu - örnek)
    if (bankId && typeof bankId === "string") {
      const { data: bank } = await supabase.from("banks").select("id, name").eq("id", bankId).single()
      if (bank && bank.name && bank.name.toLowerCase().includes("ziraat")) {
        // Gerçek projede burada Ziraat POS API'ye istek atılır ve dönen form alınır
        // Şimdilik örnek bir HTML formu dönüyoruz
        const htmlForm = `
          <form id='ziraatForm' action='https://sanalpos.ziraatbank.com.tr/fim/est3dgate' method='POST'>
            <input type='hidden' name='clientid' value='TESTCLIENTID' />
            <input type='hidden' name='amount' value='${amount}' />
            <input type='hidden' name='oid' value='${orderId || ''}' />
            <input type='hidden' name='okUrl' value='${returnUrl || "https://yourdomain.com/odeme/sonuc"}' />
            <input type='hidden' name='failUrl' value='${returnUrl || "https://yourdomain.com/odeme/sonuc"}' />
            <input type='hidden' name='rnd' value='${Math.random()}' />
            <input type='hidden' name='islemtipi' value='Auth' />
            <input type='hidden' name='taksit' value='' />
            <input type='hidden' name='islemtutar' value='${amount}' />
            <input type='hidden' name='toplam' value='${amount}' />
            <input type='hidden' name='currency' value='949' />
            <input type='hidden' name='lang' value='tr' />
            <input type='hidden' name='storetype' value='3d_pay_hosting' />
            <input type='hidden' name='pan' value='4111111111111111' />
            <input type='hidden' name='Ecom_Payment_Card_ExpDate_Month' value='12' />
            <input type='hidden' name='Ecom_Payment_Card_ExpDate_Year' value='25' />
            <input type='hidden' name='cv2' value='000' />
            <input type='hidden' name='cardHolderName' value='TEST USER' />
            <input type='hidden' name='clientIp' value='127.0.0.1' />
            <input type='submit' value='Ziraat POS ile Öde' />
          </form>
          <script>document.getElementById('ziraatForm').submit();</script>
        `
        return NextResponse.json({
          success: true,
          htmlForm,
          orderId,
        })
      }
    }

    const paymentResult = await paymentService.initiatePayment({
      orderId,
      storeId: order?.store_id,
      sellerId: order?.store_id, // Burada satıcı ID'si olarak store_id kullanılıyor
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
      returnUrl: returnUrl || `${request.headers.get("origin")}/odeme/sonuc`,
      ipAddress,
      userAgent,
    })

    if (!paymentResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: paymentResult.errorMessage,
        },
        { status: 400 },
      )
    }

    // Eğer orderId yoksa, ödeme başarılı olursa sipariş oluştur
    let createdOrderId = orderId
    if (!orderId && paymentResult.success) {
      // Sepet veya ürün bilgilerini body'den al (ör: cartItems, address, userId, amount)
      // Burada örnek olarak tek ürünlü sipariş oluşturuluyor, çoklu ürün için döngü eklenebilir
      // NOT: Gerçek projede ürün ve adres bilgilerini de body'den almalısın!
      const { productId, quantity = 1, address, cartItems } = body
      // Siparişi oluştur
      const { data: newOrder, error: orderCreateError } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          total_amount: amount,
          status: "paid",
          address_full: address || "",
        })
        .select()
        .single()
      if (orderCreateError || !newOrder) {
        return NextResponse.json({ error: "Sipariş oluşturulamadı" }, { status: 500 })
      }
      createdOrderId = newOrder.id
      // Sipariş ürünlerini ekle (örnek)
      if (cartItems && Array.isArray(cartItems)) {
        // Çoklu ürün desteği
        const itemsToInsert = cartItems.map((item: any) => ({
          order_id: newOrder.id,
          product_id: item.productId,
          quantity: item.quantity,
        }))
        await supabase.from("order_items").insert(itemsToInsert)
      } else if (productId) {
        await supabase.from("order_items").insert({
          order_id: newOrder.id,
          product_id: productId,
          quantity,
        })
      }
      // Satıcıyı bul ve payout oluştur
      // Burada örnek olarak productId üzerinden satıcı bulunuyor
      if (productId) {
        const { data: product } = await supabase.from("products").select("store_id").eq("id", productId).single()
        if (product && product.store_id) {
          await supabase.from("seller_payout_transactions").insert({
            store_id: product.store_id,
            amount,
            status: "PENDING",
            description: "Otomatik ödeme talebi (ödeme sonrası)",
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      transactionId: paymentResult.transactionId,
      redirectUrl: paymentResult.redirectUrl,
      orderId: createdOrderId,
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
