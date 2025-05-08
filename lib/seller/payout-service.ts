import { createClient } from "@supabase/supabase-js"
import type { SellerPayoutTransaction } from "../payment/types"

export class PayoutService {
  private supabase

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    )
  }

  /**
   * Satıcı için ödeme özeti getirir
   */
  async getSellerPaymentSummary(sellerId: string): Promise<{
    totalSales: number
    pendingPayouts: number
    completedPayouts: number
    commissionsPaid: number
    taxesPaid: number
    netIncome: number
  }> {
    try {
      // 1. Toplam satışları hesapla
      const { data: salesData, error: salesError } = await this.supabase.rpc("calculate_seller_total_sales", {
        seller_id: sellerId,
      })

      if (salesError) throw new Error(salesError.message)

      const totalSales = salesData || 0

      // 2. Bekleyen ödemeleri hesapla
      const { data: pendingData, error: pendingError } = await this.supabase
        .from("seller_payout_transactions")
        .select("amount")
        .eq("seller_id", sellerId)
        .eq("status", "PENDING")

      if (pendingError) throw new Error(pendingError.message)

      const pendingPayouts = pendingData.reduce((sum, item) => sum + item.amount, 0)

      // 3. Tamamlanan ödemeleri hesapla
      const { data: completedData, error: completedError } = await this.supabase
        .from("seller_payout_transactions")
        .select("amount")
        .eq("seller_id", sellerId)
        .eq("status", "COMPLETED")

      if (completedError) throw new Error(completedError.message)

      const completedPayouts = completedData.reduce((sum, item) => sum + item.amount, 0)

      // 4. Komisyonları hesapla
      const { data: commissionsData, error: commissionsError } = await this.supabase.rpc(
        "calculate_seller_commissions",
        { seller_id: sellerId },
      )

      if (commissionsError) throw new Error(commissionsError.message)

      const commissionsPaid = commissionsData || 0

      // 5. Vergileri hesapla
      const { data: taxesData, error: taxesError } = await this.supabase.rpc("calculate_seller_taxes", {
        seller_id: sellerId,
      })

      if (taxesError) throw new Error(taxesError.message)

      const taxesPaid = taxesData || 0

      // 6. Net geliri hesapla
      const netIncome = totalSales - commissionsPaid - taxesPaid

      return {
        totalSales,
        pendingPayouts,
        completedPayouts,
        commissionsPaid,
        taxesPaid,
        netIncome,
      }
    } catch (error: any) {
      console.error("Payment summary error:", error)
      throw new Error(`Ödeme özeti alınırken bir hata oluştu: ${error.message}`)
    }
  }

  /**
   * Satıcı için ödeme işlemi oluşturur
   */
  async createSellerPayout(params: {
    sellerId: string
    storeId: string
    amount: number
    bankAccountId: string
    description: string
  }): Promise<SellerPayoutTransaction> {
    try {
      // 1. Satıcının bakiyesini kontrol et
      const { data: balanceData, error: balanceError } = await this.supabase.rpc("get_seller_available_balance", {
        seller_id: params.sellerId,
      })

      if (balanceError) throw new Error(balanceError.message)

      const availableBalance = balanceData || 0

      if (availableBalance < params.amount) {
        throw new Error(`Yetersiz bakiye. Mevcut bakiye: ${availableBalance} TL`)
      }

      // 2. Banka hesabını kontrol et
      const { data: bankAccount, error: bankError } = await this.supabase
        .from("seller_bank_accounts")
        .select("*")
        .eq("id", params.bankAccountId)
        .eq("seller_id", params.sellerId)
        .single()

      if (bankError) throw new Error(bankError.message)

      // 3. Ödeme işlemi oluştur
      const { data: payout, error: payoutError } = await this.supabase
        .from("seller_payout_transactions")
        .insert({
          seller_id: params.sellerId,
          store_id: params.storeId,
          amount: params.amount,
          currency: "TRY",
          status: "PENDING",
          payment_method: "BANK_TRANSFER",
          bank_account_id: params.bankAccountId,
          description: params.description,
        })
        .select()
        .single()

      if (payoutError) throw new Error(payoutError.message)

      // 4. Ödeme işlemini başlat (gerçek implementasyonda banka API'si kullanılmalı)
      // Bu örnekte sadece işlemi güncelliyoruz

      setTimeout(async () => {
        await this.processSellerPayout(payout.id)
      }, 1000)

      return payout as unknown as SellerPayoutTransaction
    } catch (error: any) {
      console.error("Payout creation error:", error)
      throw new Error(`Ödeme işlemi oluşturulurken bir hata oluştu: ${error.message}`)
    }
  }

  /**
   * Satıcı ödeme işlemini işler
   */
  private async processSellerPayout(payoutId: string): Promise<void> {
    try {
      // 1. Ödeme işlemini al
      const { data: payout, error: payoutError } = await this.supabase
        .from("seller_payout_transactions")
        .select(`
          *,
          seller_bank_accounts:bank_account_id (*)
        `)
        .eq("id", payoutId)
        .single()

      if (payoutError) throw new Error(payoutError.message)

      // 2. Banka transferini gerçekleştir (gerçek implementasyonda banka API'si kullanılmalı)
      // Bu örnekte sadece simüle ediyoruz

      const bankTransferResult = {
        success: true,
        transactionId: `TR${Date.now()}`,
        errorMessage: null,
      }

      // 3. İşlem sonucunu güncelle
      if (bankTransferResult.success) {
        await this.supabase
          .from("seller_payout_transactions")
          .update({
            status: "COMPLETED",
            transaction_id: bankTransferResult.transactionId,
            completed_at: new Date().toISOString(),
          })
          .eq("id", payoutId)

        // 4. Satıcıya bildirim gönder
        await this.supabase.from("notifications").insert({
          user_id: payout.seller_id,
          title: "Ödeme Tamamlandı",
          content: `${payout.amount} TL tutarındaki ödemeniz hesabınıza aktarıldı.`,
          type: "PAYOUT",
          reference_id: payoutId,
          is_read: false,
        })
      } else {
        await this.supabase
          .from("seller_payout_transactions")
          .update({
            status: "FAILED",
            error_message: bankTransferResult.errorMessage,
          })
          .eq("id", payoutId)

        // Satıcıya hata bildirimi gönder
        await this.supabase.from("notifications").insert({
          user_id: payout.seller_id,
          title: "Ödeme Başarısız",
          content: `${payout.amount} TL tutarındaki ödemeniz gerçekleştirilemedi: ${bankTransferResult.errorMessage}`,
          type: "PAYOUT",
          reference_id: payoutId,
          is_read: false,
        })
      }
    } catch (error: any) {
      console.error("Payout processing error:", error)

      // Hata durumunda işlemi güncelle
      await this.supabase
        .from("seller_payout_transactions")
        .update({
          status: "FAILED",
          error_message: error.message,
        })
        .eq("id", payoutId)
    }
  }

  /**
   * Satıcının ödeme geçmişini getirir
   */
  async getSellerPayoutHistory(sellerId: string): Promise<SellerPayoutTransaction[]> {
    try {
      const { data, error } = await this.supabase
        .from("seller_payout_transactions")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)
      return data as unknown as SellerPayoutTransaction[]
    } catch (error: any) {
      console.error("Payout history error:", error)
      throw new Error(`Ödeme geçmişi alınırken bir hata oluştu: ${error.message}`)
    }
  }
}
