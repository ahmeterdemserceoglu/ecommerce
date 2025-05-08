import { type NextRequest, NextResponse } from "next/server"
import { InvoiceService } from "@/lib/invoice/invoice-service"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    )

    const invoiceService = new InvoiceService()
    const invoiceId = params.id

    // Fatura bilgilerini kontrol et
    const { data: invoice, error } = await supabase.from("invoices").select("*").eq("id", invoiceId).single()

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: `Fatura bulunamadı: ${error.message}`,
        },
        { status: 404 },
      )
    }

    // PDF URL'i varsa doğrudan yönlendir
    if (invoice.pdf_url) {
      return NextResponse.redirect(invoice.pdf_url)
    }

    // PDF URL'i yoksa oluştur
    const pdfUrl = await invoiceService.generateInvoicePdf(invoiceId)

    return NextResponse.redirect(pdfUrl)
  } catch (error: any) {
    console.error("Invoice download error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Fatura indirilirken bir hata oluştu",
      },
      { status: 500 },
    )
  }
}
