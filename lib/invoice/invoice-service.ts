import { createClient } from "@supabase/supabase-js"
import type { Invoice } from "../payment/types"

export class InvoiceService {
  private supabase

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    )
  }

  /**
   * Fatura oluşturur
   */
  async createInvoice(params: {
    orderId: string
    sellerId: string
    buyerId: string
    items: {
      productId: string
      variantId?: string
      name: string
      quantity: number
      unitPrice: number
      taxRate: number
    }[]
  }): Promise<Invoice> {
    try {
      // 1. Satıcı fatura ayarlarını al
      const { data: invoiceSettings, error: settingsError } = await this.supabase
        .from("invoice_settings")
        .select("*")
        .eq("seller_id", params.sellerId)
        .single()

      if (settingsError) throw new Error(settingsError.message)

      // 2. Alıcı bilgilerini al
      const { data: buyer, error: buyerError } = await this.supabase
        .from("profiles")
        .select("*")
        .eq("id", params.buyerId)
        .single()

      if (buyerError) throw new Error(buyerError.message)

      // 3. Sipariş bilgilerini al
      const { data: order, error: orderError } = await this.supabase
        .from("orders")
        .select("*")
        .eq("id", params.orderId)
        .single()

      if (orderError) throw new Error(orderError.message)

      // 4. Fatura numarası oluştur
      const invoiceNumber = await this.generateInvoiceNumber(invoiceSettings.invoice_prefix)

      // 5. Fatura öğelerini hesapla
      const invoiceItems = params.items.map((item) => {
        const taxAmount = item.unitPrice * item.quantity * (item.taxRate / 100)
        const totalAmount = item.unitPrice * item.quantity + taxAmount

        return {
          product_id: item.productId,
          variant_id: item.variantId,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          tax_rate: item.taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
        }
      })

      // 6. Toplam tutarları hesapla
      const subtotal = invoiceItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
      const taxTotal = invoiceItems.reduce((sum, item) => sum + item.tax_amount, 0)
      const total = subtotal + taxTotal

      // 7. Fatura tipini belirle
      const invoiceType = invoiceSettings.is_e_invoice_user && buyer.is_corporate ? "E_FATURA" : "E_ARSIV"

      // 8. Fatura oluştur
      const { data: invoice, error: invoiceError } = await this.supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          order_id: params.orderId,
          seller_id: params.sellerId,
          buyer_id: params.buyerId,
          buyer_type: buyer.is_corporate ? "CORPORATE" : "INDIVIDUAL",
          buyer_name: buyer.is_corporate ? buyer.company_name : `${buyer.first_name} ${buyer.last_name}`,
          buyer_tax_number: buyer.tax_number,
          buyer_tax_office: buyer.tax_office,
          buyer_address: buyer.address,
          subtotal,
          tax_total: taxTotal,
          total,
          currency: order.currency || "TRY",
          status: "DRAFT",
          type: invoiceType,
        })
        .select()
        .single()

      if (invoiceError) throw new Error(invoiceError.message)

      // 9. Fatura öğelerini ekle
      const invoiceItemsWithId = invoiceItems.map((item) => ({
        ...item,
        invoice_id: invoice.id,
      }))

      await this.supabase.from("invoice_items").insert(invoiceItemsWithId)

      // 10. GİB'e fatura gönder
      if (invoiceSettings.auto_invoice_generation) {
        await this.sendInvoiceToGIB(invoice.id)
      }

      return invoice as unknown as Invoice
    } catch (error: any) {
      console.error("Invoice creation error:", error)
      throw new Error(`Fatura oluşturulurken bir hata oluştu: ${error.message}`)
    }
  }

  /**
   * Fatura numarası oluşturur
   */
  private async generateInvoiceNumber(prefix: string): Promise<string> {
    // Son fatura numarasını al ve artır
    const { data, error } = await this.supabase
      .from("invoices")
      .select("invoice_number")
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) throw new Error(error.message)

    let sequenceNumber = 1
    if (data && data.length > 0) {
      const lastInvoiceNumber = data[0].invoice_number
      const match = lastInvoiceNumber.match(/(\d+)$/)
      if (match) {
        sequenceNumber = Number.parseInt(match[1], 10) + 1
      }
    }

    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")

    return `${prefix}${year}${month}${String(sequenceNumber).padStart(8, "0")}`
  }

  /**
   * Faturayı GİB'e gönderir
   */
  async sendInvoiceToGIB(invoiceId: string): Promise<void> {
    try {
      // 1. Fatura bilgilerini al
      const { data: invoice, error: invoiceError } = await this.supabase
        .from("invoices")
        .select(`
          *,
          invoice_items (*),
          sellers:seller_id (
            invoice_settings (*)
          )
        `)
        .eq("id", invoiceId)
        .single()

      if (invoiceError) throw new Error(invoiceError.message)

      // 2. Fatura ayarlarını al
      const invoiceSettings = invoice.sellers.invoice_settings

      // 3. GİB API bilgilerini kontrol et
      if (!invoiceSettings.gib_username || !invoiceSettings.gib_password || !invoiceSettings.gib_api_key) {
        throw new Error("GİB API bilgileri eksik")
      }

      // 4. Fatura XML'ini oluştur
      const invoiceXml = this.generateInvoiceXml(invoice)

      // 5. GİB API'sine gönder
      const gibResponse = await this.sendToGIBApi({
        username: invoiceSettings.gib_username,
        password: invoiceSettings.gib_password,
        apiKey: invoiceSettings.gib_api_key,
        invoiceType: invoice.type,
        invoiceXml,
      })

      // 6. Faturayı güncelle
      await this.supabase
        .from("invoices")
        .update({
          status: "ISSUED",
          gib_uuid: gibResponse.uuid,
          pdf_url: gibResponse.pdfUrl,
          xml_url: gibResponse.xmlUrl,
          issued_at: new Date().toISOString(),
        })
        .eq("id", invoiceId)
    } catch (error: any) {
      console.error("GIB invoice sending error:", error)

      // Hata durumunda faturayı güncelle
      await this.supabase
        .from("invoices")
        .update({
          status: "REJECTED",
          error_message: error.message,
        })
        .eq("id", invoiceId)

      throw new Error(`Fatura GİB'e gönderilirken bir hata oluştu: ${error.message}`)
    }
  }

  /**
   * Fatura XML'i oluşturur
   */
  private generateInvoiceXml(invoice: any): string {
    // Bu kısım gerçek GİB XML formatına göre değişecektir
    // Örnek bir XML şablonu:

    const items = invoice.invoice_items
      .map(
        (item: any) => `
      <InvoiceLine>
        <ID>${item.id}</ID>
        <Item>
          <Name>${item.name}</Name>
        </Item>
        <Price>${item.unit_price}</Price>
        <Quantity>${item.quantity}</Quantity>
        <TaxRate>${item.tax_rate}</TaxRate>
        <TaxAmount>${item.tax_amount}</TaxAmount>
        <LineExtensionAmount>${item.total_amount}</LineExtensionAmount>
      </InvoiceLine>
    `,
      )
      .join("")

    return `
      <?xml version="1.0" encoding="UTF-8"?>
      <Invoice>
        <ID>${invoice.invoice_number}</ID>
        <IssueDate>${new Date().toISOString().split("T")[0]}</IssueDate>
        <AccountingSupplierParty>
          <Party>
            <PartyName>${invoice.sellers.invoice_settings.company_name}</PartyName>
            <PostalAddress>${invoice.sellers.invoice_settings.address}</PostalAddress>
            <TaxScheme>
              <TaxTypeCode>KDV</TaxTypeCode>
              <TaxOffice>${invoice.sellers.invoice_settings.tax_office}</TaxOffice>
              <TaxNumber>${invoice.sellers.invoice_settings.tax_number}</TaxNumber>
            </TaxScheme>
          </Party>
        </AccountingSupplierParty>
        <AccountingCustomerParty>
          <Party>
            <PartyName>${invoice.buyer_name}</PartyName>
            <PostalAddress>${invoice.buyer_address}</PostalAddress>
            ${
              invoice.buyer_tax_number
                ? `
            <TaxScheme>
              <TaxTypeCode>KDV</TaxTypeCode>
              <TaxOffice>${invoice.buyer_tax_office}</TaxOffice>
              <TaxNumber>${invoice.buyer_tax_number}</TaxNumber>
            </TaxScheme>
            `
                : ""
            }
          </Party>
        </AccountingCustomerParty>
        <InvoiceLines>
          ${items}
        </InvoiceLines>
        <TaxTotal>${invoice.tax_total}</TaxTotal>
        <LegalMonetaryTotal>
          <LineExtensionAmount>${invoice.subtotal}</LineExtensionAmount>
          <TaxExclusiveAmount>${invoice.subtotal}</TaxExclusiveAmount>
          <TaxInclusiveAmount>${invoice.total}</TaxInclusiveAmount>
          <PayableAmount>${invoice.total}</PayableAmount>
        </LegalMonetaryTotal>
      </Invoice>
    `
  }

  /**
   * GİB API'sine fatura gönderir
   */
  private async sendToGIBApi(params: {
    username: string
    password: string
    apiKey: string
    invoiceType: string
    invoiceXml: string
  }): Promise<{
    success: boolean
    uuid: string
    pdfUrl: string
    xmlUrl: string
  }> {
    try {
      // Bu kısım gerçek GİB API entegrasyonuna göre değişecektir
      // Örnek bir implementasyon:

      const endpoint =
        params.invoiceType === "E_FATURA"
          ? "https://earsivportal.efatura.gov.tr/earsiv-services/dispatch"
          : "https://earsivportal.efatura.gov.tr/earsiv-services/dispatch"

      const headers = {
        "Content-Type": "application/xml",
        Authorization: `Basic ${Buffer.from(`${params.username}:${params.password}`).toString("base64")}`,
        "X-API-KEY": params.apiKey,
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: params.invoiceXml,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`GİB API hatası: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      return {
        success: true,
        uuid: result.uuid,
        pdfUrl: result.pdfUrl,
        xmlUrl: result.xmlUrl,
      }
    } catch (error: any) {
      console.error("GIB API error:", error)
      throw new Error(`GİB API'si ile iletişim sırasında bir hata oluştu: ${error.message}`)
    }
  }

  /**
   * Fatura PDF'ini oluşturur
   */
  async generateInvoicePdf(invoiceId: string): Promise<string> {
    try {
      // 1. Fatura bilgilerini al
      const { data: invoice, error: invoiceError } = await this.supabase
        .from("invoices")
        .select(`
          *,
          invoice_items (*),
          sellers:seller_id (
            invoice_settings (*)
          )
        `)
        .eq("id", invoiceId)
        .single()

      if (invoiceError) throw new Error(invoiceError.message)

      // 2. PDF oluştur (gerçek implementasyonda bir PDF kütüphanesi kullanılmalı)
      // Bu örnekte GİB'den gelen PDF URL'ini kullanıyoruz

      if (!invoice.pdf_url) {
        throw new Error("Fatura PDF URL'i bulunamadı")
      }

      return invoice.pdf_url
    } catch (error: any) {
      console.error("PDF generation error:", error)
      throw new Error(`Fatura PDF'i oluşturulurken bir hata oluştu: ${error.message}`)
    }
  }
}
