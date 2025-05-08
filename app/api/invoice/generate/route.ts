import { type NextRequest, NextResponse } from "next/server"
import { InvoiceService } from "@/lib/invoice/invoice-service"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    )

    const invoiceService = new InvoiceService()
    const body = await request.json()

    // Gerekli alanları kontrol et
    if (!body.orderId) {
      return NextResponse.json(
        {
          success: false,
          message: "Sipariş ID'si gereklidir",
        },
        { status: 400 },
      )
    }

    // Sipariş bilgilerini al
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          product:product_id (*),
          variant:variant_id (*)
        ),
        store:store_id (*),
        buyer:user_id (*)
      `)
      .eq("id", body.orderId)
      .single()

    if (orderError) {
      return NextResponse.json(
        {
          success: false,
          message: `Sipariş bulunamadı: ${orderError.message}`,
        },
        { status: 404 },
      )
    }

    // Fatura öğelerini hazırla
    const invoiceItems = order.order_items.map((item: any) => ({
      productId: item.product_id,
      variantId: item.variant_id,
      name: item.variant ? `${item.product.name} - ${item.variant.name}` : item.product.name,
      quantity: item.quantity,
      unitPrice: item.price,
      taxRate: item.tax_rate || 18, // Varsayılan KDV oranı
    }))

    // Fatura oluştur
    const invoice = await invoiceService.createInvoice({
      orderId: body.orderId,
      sellerId: order.store.seller_id,
      buyerId: order.buyer.id,
      items: invoiceItems,
    })

    // Siparişi güncelle
    await supabase
      .from("orders")
      .update({
        invoice_id: invoice.id,
        invoice_status: "ISSUED",
      })
      .eq("id", body.orderId)

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      pdfUrl: invoice.pdfUrl,
    })
  } catch (error: any) {
    console.error("Invoice generation error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Fatura oluşturulurken bir hata oluştu",
      },
      { status: 500 },
    )
  }
}
