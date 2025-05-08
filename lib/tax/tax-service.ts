import { createClient } from "@supabase/supabase-js"
import type { TaxSettings } from "../payment/types"

export class TaxService {
  private supabase

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    )
  }

  /**
   * Ürün için vergi oranını hesaplar
   */
  async calculateTaxRate(params: {
    productId: string
    categoryId: string
    sellerId: string
  }): Promise<number> {
    try {
      // 1. Ürün kategorisine göre vergi ayarlarını al
      const { data: taxSettings, error } = await this.supabase
        .from("tax_settings")
        .select("*")
        .eq("is_active", true)
        .or(`applies_to.eq.ALL,category_ids.cs.{${params.categoryId}},seller_types.cs.{${params.sellerId}}`)
        .eq("type", "KDV")

      if (error) throw new Error(error.message)

      // 2. Uygun vergi oranını bul
      let taxRate = 18 // Varsayılan KDV oranı

      if (taxSettings && taxSettings.length > 0) {
        // Öncelik sırası: Satıcı tipi > Kategori > Genel
        const sellerSpecificTax = taxSettings.find(
          (tax) => tax.applies_to === "SELLER_TYPE" && tax.seller_types?.includes(params.sellerId),
        )

        if (sellerSpecificTax) {
          taxRate = sellerSpecificTax.rate
        } else {
          const categorySpecificTax = taxSettings.find(
            (tax) => tax.applies_to === "PRODUCT_CATEGORY" && tax.category_ids?.includes(params.categoryId),
          )

          if (categorySpecificTax) {
            taxRate = categorySpecificTax.rate
          } else {
            const generalTax = taxSettings.find((tax) => tax.applies_to === "ALL")
            if (generalTax) {
              taxRate = generalTax.rate
            }
          }
        }
      }

      return taxRate
    } catch (error: any) {
      console.error("Tax calculation error:", error)
      return 18 // Hata durumunda varsayılan KDV oranı
    }
  }

  /**
   * Vergi ayarlarını getirir
   */
  async getTaxSettings(): Promise<TaxSettings[]> {
    try {
      const { data, error } = await this.supabase
        .from("tax_settings")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)
      return data as unknown as TaxSettings[]
    } catch (error: any) {
      console.error("Get tax settings error:", error)
      throw new Error(`Vergi ayarları alınırken bir hata oluştu: ${error.message}`)
    }
  }

  /**
   * Vergi ayarı oluşturur
   */
  async createTaxSetting(params: {
    name: string
    type: "KDV" | "STOPAJ" | "GELIR_VERGISI" | "MUHTASAR"
    rate: number
    appliesTo: "ALL" | "PRODUCT_CATEGORY" | "SELLER_TYPE"
    categoryIds?: string[]
    sellerTypes?: string[]
  }): Promise<TaxSettings> {
    try {
      const { data, error } = await this.supabase
        .from("tax_settings")
        .insert({
          name: params.name,
          type: params.type,
          rate: params.rate,
          is_active: true,
          applies_to: params.appliesTo,
          category_ids: params.categoryIds,
          seller_types: params.sellerTypes,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as unknown as TaxSettings
    } catch (error: any) {
      console.error("Create tax setting error:", error)
      throw new Error(`Vergi ayarı oluşturulurken bir hata oluştu: ${error.message}`)
    }
  }

  /**
   * Vergi ayarını günceller
   */
  async updateTaxSetting(
    id: string,
    params: {
      name?: string
      rate?: number
      isActive?: boolean
      appliesTo?: "ALL" | "PRODUCT_CATEGORY" | "SELLER_TYPE"
      categoryIds?: string[]
      sellerTypes?: string[]
    },
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("tax_settings")
        .update({
          name: params.name,
          rate: params.rate,
          is_active: params.isActive,
          applies_to: params.appliesTo,
          category_ids: params.categoryIds,
          seller_types: params.sellerTypes,
        })
        .eq("id", id)

      if (error) throw new Error(error.message)
    } catch (error: any) {
      console.error("Update tax setting error:", error)
      throw new Error(`Vergi ayarı güncellenirken bir hata oluştu: ${error.message}`)
    }
  }

  /**
   * Vergi ayarını siler
   */
  async deleteTaxSetting(id: string): Promise<void> {
    try {
      const { error } = await this.supabase.from("tax_settings").delete().eq("id", id)

      if (error) throw new Error(error.message)
    } catch (error: any) {
      console.error("Delete tax setting error:", error)
      throw new Error(`Vergi ayarı silinirken bir hata oluştu: ${error.message}`)
    }
  }

  /**
   * Aylık vergi özeti oluşturur
   */
  async generateMonthlyTaxReport(params: {
    sellerId: string
    year: number
    month: number
  }): Promise<{
    totalSales: number
    totalTaxCollected: {
      KDV: number
      STOPAJ: number
      GELIR_VERGISI: number
      MUHTASAR: number
    }
    taxableIncome: number
    netIncome: number
  }> {
    try {
      const startDate = new Date(params.year, params.month - 1, 1).toISOString()
      const endDate = new Date(params.year, params.month, 0).toISOString()

      // 1. Satıcının bu aydaki faturalarını al
      const { data: invoices, error: invoicesError } = await this.supabase
        .from("invoices")
        .select(`
          *,
          invoice_items (*)
        `)
        .eq("seller_id", params.sellerId)
        .eq("status", "ISSUED")
        .gte("issued_at", startDate)
        .lte("issued_at", endDate)

      if (invoicesError) throw new Error(invoicesError.message)

      // 2. Toplam satış ve vergileri hesapla
      let totalSales = 0
      let totalKDV = 0
      let totalSTOPAJ = 0
      let totalGELIR_VERGISI = 0
      let totalMUHTASAR = 0

      invoices.forEach((invoice) => {
        totalSales += invoice.subtotal

        invoice.invoice_items.forEach((item: any) => {
          if (item.tax_rate > 0) {
            totalKDV += item.tax_amount
          }
        })
      })

      // 3. Diğer vergileri hesapla (örnek)
      // Gerçek hesaplamalar daha karmaşık olabilir
      totalSTOPAJ = totalSales * 0.2 * 0.2 // Örnek: %20 gelir üzerinden %20 stopaj
      totalGELIR_VERGISI = totalSales * 0.2 // Örnek: %20 gelir vergisi
      totalMUHTASAR = totalSales * 0.02 // Örnek: %2 muhtasar

      const taxableIncome = totalSales - totalKDV
      const netIncome = taxableIncome - totalSTOPAJ - totalGELIR_VERGISI - totalMUHTASAR

      return {
        totalSales,
        totalTaxCollected: {
          KDV: totalKDV,
          STOPAJ: totalSTOPAJ,
          GELIR_VERGISI: totalGELIR_VERGISI,
          MUHTASAR: totalMUHTASAR,
        },
        taxableIncome,
        netIncome,
      }
    } catch (error: any) {
      console.error("Tax report generation error:", error)
      throw new Error(`Vergi raporu oluşturulurken bir hata oluştu: ${error.message}`)
    }
  }
}
