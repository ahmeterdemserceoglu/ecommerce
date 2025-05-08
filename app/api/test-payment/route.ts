import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const body = await request.json()
    const { productId, quantity, userId } = body

    if (!productId || !quantity || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Ürün bilgilerini al
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, price, discount_price, store_id")
      .eq("id", productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Mağaza bilgilerini al
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, name, user_id")
      .eq("id", product.store_id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    // Kullanıcı adresini al (varsayılan adres)
    const { data: address, error: addressError } = await supabase
      .from("user_addresses")
      .select("*")
      .eq("user_id", userId)
      .eq("is_default", true)
      .single()

    // Adres bulunamazsa basit bir adres oluştur
    const shippingAddress = address
      ? `${address.address_line1}, ${address.city}, ${address.postal_code}`
      : "Test Adres, Test Şehir, 00000"

    // Sipariş oluştur
    const orderTotal = (product.discount_price || product.price) * quantity
    const shippingFee = 15 // Sabit kargo ücreti
    const totalAmount = orderTotal + shippingFee

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        store_id: store.id,
        status: "pending",
        payment_status: "pending",
        shipping_status: "pending",
        subtotal_amount: orderTotal,
        shipping_fee: shippingFee,
        total_amount: totalAmount,
        shipping_address: shippingAddress,
        billing_address: shippingAddress,
      })
      .select()
      .single()

    if (orderError) {
      return NextResponse.json({ error: "Failed to create order", details: orderError.message }, { status: 500 })
    }

    // Sipariş öğesi oluştur
    const { error: orderItemError } = await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: product.id,
      quantity: quantity,
      price: product.discount_price || product.price,
      total_price: (product.discount_price || product.price) * quantity,
    })

    if (orderItemError) {
      return NextResponse.json(
        { error: "Failed to create order item", details: orderItemError.message },
        { status: 500 },
      )
    }

    // Test ödeme işlemi oluştur
    const { data: transaction, error: transactionError } = await supabase
      .from("payment_transactions")
      .insert({
        order_id: order.id,
        store_id: store.id,
        seller_id: store.user_id,
        amount: totalAmount,
        currency: "TRY",
        status: "completed", // Test ödemesi doğrudan tamamlandı olarak işaretlenir
        payment_method: "TEST_PAYMENT",
        transaction_id: `test_${Date.now()}`,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (transactionError) {
      return NextResponse.json(
        { error: "Failed to create payment transaction", details: transactionError.message },
        { status: 500 },
      )
    }

    // Siparişi güncelle - ödeme tamamlandı olarak işaretle
    await supabase
      .from("orders")
      .update({
        status: "processing",
        payment_status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)

    // Satıcıya bildirim gönder
    await supabase.from("notifications").insert({
      user_id: store.user_id,
      title: "Yeni Sipariş",
      content: `${order.id} numaralı yeni bir siparişiniz var.`,
      type: "order",
      reference_id: order.id,
    })

    return NextResponse.json({
      success: true,
      orderId: order.id,
      transactionId: transaction.id,
    })
  } catch (error: any) {
    console.error("Test payment error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Test payment failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
