import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const body = await request.json()
    const { provider, event, data } = body

    // Webhook imzasını doğrula (gerçek uygulamada)
    // const signature = request.headers.get('x-webhook-signature')
    // if (!verifyWebhookSignature(signature, JSON.stringify(body), process.env.WEBHOOK_SECRET)) {
    //   return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 })
    // }

    console.log(`Webhook alındı: ${provider} - ${event}`)

    // Ödeme sağlayıcısına göre işlem yap
    switch (provider) {
      case "iyzico":
        return handleIyzicoWebhook(event, data, supabase)
      case "paytr":
        return handlePaytrWebhook(event, data, supabase)
      case "stripe":
        return handleStripeWebhook(event, data, supabase)
      default:
        return NextResponse.json({ error: "Unsupported payment provider" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Webhook işleme hatası:", error)
    return NextResponse.json({ error: "Webhook processing failed", details: error.message }, { status: 500 })
  }
}

async function handleIyzicoWebhook(event: string, data: any, supabase: any) {
  switch (event) {
    case "payment.success":
      await updatePaymentStatus(data.paymentId, "completed", data, supabase)
      await updateOrderStatus(data.orderId, "processing", supabase)
      await createNotification(data.sellerId, "payment_success", data.orderId, supabase)
      break
    case "payment.failed":
      await updatePaymentStatus(data.paymentId, "failed", data, supabase)
      await updateOrderStatus(data.orderId, "payment_failed", supabase)
      break
    case "payment.refunded":
      await updatePaymentStatus(data.paymentId, "refunded", data, supabase)
      await updateOrderStatus(data.orderId, "refunded", supabase)
      await createNotification(data.sellerId, "payment_refunded", data.orderId, supabase)
      break
  }

  return NextResponse.json({ success: true })
}

async function handlePaytrWebhook(event: string, data: any, supabase: any) {
  // PayTR için benzer işlemler
  switch (event) {
    case "payment_success":
      await updatePaymentStatus(data.merchant_oid, "completed", data, supabase)
      await updateOrderStatus(data.merchant_oid, "processing", supabase)
      // Satıcı ID'sini almak için sipariş bilgilerini sorgula
      const { data: orderData } = await supabase.from("orders").select("store_id").eq("id", data.merchant_oid).single()

      if (orderData) {
        await createNotification(orderData.store_id, "payment_success", data.merchant_oid, supabase)
      }
      break
    case "payment_failed":
      await updatePaymentStatus(data.merchant_oid, "failed", data, supabase)
      await updateOrderStatus(data.merchant_oid, "payment_failed", supabase)
      break
  }

  return NextResponse.json({ success: true })
}

async function handleStripeWebhook(event: string, data: any, supabase: any) {
  // Stripe için benzer işlemler
  const eventType = event // Stripe'da event doğrudan event_type olarak gelir

  switch (eventType) {
    case "payment_intent.succeeded":
      const orderId = data.metadata?.orderId
      if (orderId) {
        await updatePaymentStatus(orderId, "completed", data, supabase)
        await updateOrderStatus(orderId, "processing", supabase)

        // Satıcı ID'sini almak için sipariş bilgilerini sorgula
        const { data: orderData } = await supabase.from("orders").select("store_id").eq("id", orderId).single()

        if (orderData) {
          await createNotification(orderData.store_id, "payment_success", orderId, supabase)
        }
      }
      break
    case "payment_intent.payment_failed":
      const failedOrderId = data.metadata?.orderId
      if (failedOrderId) {
        await updatePaymentStatus(failedOrderId, "failed", data, supabase)
        await updateOrderStatus(failedOrderId, "payment_failed", supabase)
      }
      break
  }

  return NextResponse.json({ success: true })
}

async function updatePaymentStatus(paymentId: string, status: string, data: any, supabase: any) {
  await supabase
    .from("payment_transactions")
    .update({
      status: status,
      provider_response: data,
      updated_at: new Date().toISOString(),
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("transaction_id", paymentId)
}

async function updateOrderStatus(orderId: string, status: string, supabase: any) {
  await supabase
    .from("orders")
    .update({
      status: status,
      payment_status: status === "processing" ? "paid" : status === "payment_failed" ? "failed" : status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
}

async function createNotification(userId: string, type: string, referenceId: string, supabase: any) {
  let title = ""
  let content = ""

  switch (type) {
    case "payment_success":
      title = "Ödeme Alındı"
      content = `${referenceId} numaralı sipariş için ödeme başarıyla alındı.`
      break
    case "payment_refunded":
      title = "Ödeme İade Edildi"
      content = `${referenceId} numaralı sipariş için ödeme iade edildi.`
      break
  }

  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    content,
    type,
    reference_id: referenceId,
    is_read: false,
  })
}
