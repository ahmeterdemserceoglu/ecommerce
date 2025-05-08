import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const body = await request.json()
    const { transactionId, amount, reason, userId, isAdmin = false } = body

    // Gerekli alanları kontrol et
    if (!transactionId || !amount || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // İşlem bilgilerini al
    const { data: transaction, error: transactionError } = await supabase
      .from("payment_transactions")
      .select("id, order_id, store_id, amount, status")
      .eq("id", transactionId)
      .single()

    if (transactionError || !transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // İşlemin durumunu kontrol et
    if (transaction.status !== "completed") {
      return NextResponse.json({ error: "Transaction is not completed" }, { status: 400 })
    }

    // Yetki kontrolü
    if (!isAdmin) {
      // Admin değilse, sadece mağaza sahibi iade yapabilir
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("id, user_id")
        .eq("id", transaction.store_id)
        .single()

      if (storeError || !store) {
        return NextResponse.json({ error: "Store not found" }, { status: 404 })
      }

      if (store.user_id !== userId) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 })
      }
    }

    // İade miktarının orijinal işlem tutarını aşmadığını kontrol et
    if (amount > transaction.amount) {
      return NextResponse.json({ error: "Refund amount exceeds transaction amount" }, { status: 400 })
    }

    // İade işlemini oluştur
    const { data: refund, error: refundError } = await supabase
      .from("refunds")
      .insert({
        transaction_id: transactionId,
        order_id: transaction.order_id,
        amount,
        reason,
        status: "pending",
        requested_by: userId,
      })
      .select()
      .single()

    if (refundError) {
      return NextResponse.json({ error: "Failed to create refund" }, { status: 500 })
    }

    // Gerçek uygulamada burada ödeme sağlayıcısına iade isteği gönderilir
    // Örnek olarak başarılı kabul ediyoruz

    // İade durumunu güncelle
    await supabase
      .from("refunds")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", refund.id)

    // İşlem durumunu güncelle (kısmi iade veya tam iade)
    const isFullRefund = amount === transaction.amount
    await supabase
      .from("payment_transactions")
      .update({
        status: isFullRefund ? "refunded" : "partially_refunded",
        refunded_amount: amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId)

    // Sipariş durumunu güncelle
    await supabase
      .from("orders")
      .update({
        status: isFullRefund ? "refunded" : "partially_refunded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.order_id)

    // Müşteriye bildirim gönder
    const { data: order } = await supabase.from("orders").select("user_id").eq("id", transaction.order_id).single()

    if (order) {
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: "Ödeme İadesi",
        content: `${transaction.order_id} numaralı siparişiniz için ${amount} TL tutarında iade yapıldı.`,
        type: "refund",
        reference_id: transaction.order_id,
      })
    }

    return NextResponse.json({
      success: true,
      refundId: refund.id,
    })
  } catch (error: any) {
    console.error("Refund error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Refund failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
