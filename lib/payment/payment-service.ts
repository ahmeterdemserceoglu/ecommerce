import { createClient } from "@supabase/supabase-js"
import type { CardToken } from "./types"

export class PaymentService {
  private supabase

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    )
  }

  /**
   * Ödeme işlemini başlatır
   */
  async initiatePayment(params: {
    orderId: string
    storeId: string
    sellerId: string
    amount: number
    currency: string
    paymentMethod: string
    cardNumber?: string
    cardHolderName?: string
    expiryMonth?: string
    expiryYear?: string
    cvv?: string
    savedCardId?: string
    bankId: string
    installmentCount: number
    use3DSecure: boolean
    returnUrl: string
    ipAddress: string
    userAgent: string
  }): Promise<{
    success: boolean
    transactionId?: string
    redirectUrl?: string
    errorMessage?: string
  }> {
    try {
      // 1. Ödeme işlemi kaydını oluştur
      const { data: transaction, error: transactionError } = await this.supabase
        .from("payment_transactions")
        .insert({
          order_id: params.orderId,
          store_id: params.storeId,
          seller_id: params.sellerId,
          amount: params.amount,
          currency: params.currency,
          status: "PENDING",
          payment_method: params.paymentMethod,
          bank_id: params.bankId,
          installment_count: params.installmentCount,
          is_3d_secure: params.use3DSecure,
        })
        .select()
        .single()

      if (transactionError) throw new Error(transactionError.message)

      // 2. Banka entegrasyonu için gerekli bilgileri al
      const { data: bank, error: bankError } = await this.supabase
        .from("banks")
        .select("*")
        .eq("id", params.bankId)
        .single()

      if (bankError) throw new Error(bankError.message)

      // 3. Kart bilgilerini hazırla
      let cardDetails
      if (params.savedCardId) {
        // Kayıtlı kart kullanılıyorsa
        const { data: savedCard, error: cardError } = await this.supabase
          .from("card_tokens")
          .select("*")
          .eq("id", params.savedCardId)
          .single()

        if (cardError) throw new Error(cardError.message)

        cardDetails = {
          token: savedCard.token_value,
          cvv: params.cvv,
        }
      } else {
        // Yeni kart bilgileri kullanılıyorsa
        cardDetails = {
          cardNumber: params.cardNumber,
          cardHolderName: params.cardHolderName,
          expiryMonth: params.expiryMonth,
          expiryYear: params.expiryYear,
          cvv: params.cvv,
        }
      }

      // 4. Banka API'sine istek gönder
      const paymentResult = await this.processBankPayment({
        transactionId: transaction.id,
        amount: params.amount,
        currency: params.currency,
        cardDetails,
        bankApiEndpoint: bank.pos_api_endpoint,
        bankApiKey: bank.pos_api_key,
        bankApiSecret: bank.pos_api_secret,
        use3DSecure: params.use3DSecure,
        returnUrl: params.returnUrl,
        installmentCount: params.installmentCount,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      })

      // 5. İşlem sonucunu güncelle
      await this.supabase
        .from("payment_transactions")
        .update({
          status: paymentResult.success ? (params.use3DSecure ? "PROCESSING" : "COMPLETED") : "FAILED",
          transaction_id: paymentResult.transactionId,
          error_code: paymentResult.errorCode,
          error_message: paymentResult.errorMessage,
          card_last_four: params.cardNumber ? params.cardNumber.slice(-4) : undefined,
          completed_at: paymentResult.success && !params.use3DSecure ? new Date().toISOString() : null,
        })
        .eq("id", transaction.id)

      // 6. Kart bilgilerini kaydetme isteği varsa
      if (paymentResult.success && !params.savedCardId && params.cardNumber) {
        await this.saveCardToken({
          userId: params.sellerId, // Burada alıcının ID'si kullanılmalı
          cardHolderName: params.cardHolderName!,
          cardNumber: params.cardNumber,
          expiryMonth: params.expiryMonth!,
          expiryYear: params.expiryYear!,
          bankId: params.bankId,
          tokenValue: paymentResult.cardToken!,
        })
      }

      return {
        success: paymentResult.success,
        transactionId: transaction.id,
        redirectUrl: paymentResult.redirectUrl,
        errorMessage: paymentResult.errorMessage,
      }
    } catch (error: any) {
      console.error("Payment initiation error:", error)
      return {
        success: false,
        errorMessage: error.message || "Ödeme başlatılırken bir hata oluştu",
      }
    }
  }

  /**
   * 3D Secure sonrası ödeme sonucunu işler
   */
  async complete3DSecurePayment(params: {
    transactionId: string
    paymentId: string
    status: string
    bankResponseData: any
  }): Promise<{
    success: boolean
    orderId?: string
    errorMessage?: string
  }> {
    try {
      // 1. İşlem kaydını bul
      const { data: transaction, error: transactionError } = await this.supabase
        .from("payment_transactions")
        .select("*")
        .eq("id", params.transactionId)
        .single()

      if (transactionError) throw new Error(transactionError.message)

      // 2. Banka API'sine 3D sonucu doğrulama isteği gönder
      const { data: bank, error: bankError } = await this.supabase
        .from("banks")
        .select("*")
        .eq("id", transaction.bank_id)
        .single()

      if (bankError) throw new Error(bankError.message)

      // 3. Banka API'sine 3D sonucu doğrulama isteği gönder
      const verificationResult = await this.verify3DSecurePayment({
        bankApiEndpoint: bank.pos_api_endpoint,
        bankApiKey: bank.pos_api_key,
        bankApiSecret: bank.pos_api_secret,
        paymentId: params.paymentId,
        bankResponseData: params.bankResponseData,
      })

      // 4. İşlem sonucunu güncelle
      await this.supabase
        .from("payment_transactions")
        .update({
          status: verificationResult.success ? "COMPLETED" : "FAILED",
          error_code: verificationResult.errorCode,
          error_message: verificationResult.errorMessage,
          completed_at: verificationResult.success ? new Date().toISOString() : null,
        })
        .eq("id", transaction.id)

      // 5. Siparişi güncelle
      if (verificationResult.success) {
        await this.supabase
          .from("orders")
          .update({
            payment_status: "PAID",
            status: "PROCESSING",
          })
          .eq("id", transaction.order_id)

        // 6. Satıcı bildirimini oluştur
        await this.createSellerNotification(transaction.seller_id, transaction.order_id)
      }

      return {
        success: verificationResult.success,
        orderId: transaction.order_id,
        errorMessage: verificationResult.errorMessage,
      }
    } catch (error: any) {
      console.error("3D Secure completion error:", error)
      return {
        success: false,
        errorMessage: error.message || "3D Secure doğrulama sırasında bir hata oluştu",
      }
    }
  }

  /**
   * Kart bilgilerini tokenize ederek saklar
   */
  private async saveCardToken(params: {
    userId: string
    cardHolderName: string
    cardNumber: string
    expiryMonth: string
    expiryYear: string
    bankId: string
    tokenValue: string
  }): Promise<CardToken> {
    const cardType = this.detectCardType(params.cardNumber)
    const lastFourDigits = params.cardNumber.slice(-4)

    const { data, error } = await this.supabase
      .from("card_tokens")
      .insert({
        user_id: params.userId,
        card_holder_name: params.cardHolderName,
        last_four_digits: lastFourDigits,
        expiry_month: params.expiryMonth,
        expiry_year: params.expiryYear,
        card_type: cardType,
        bank_id: params.bankId,
        token_value: params.tokenValue,
        is_default: false,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as unknown as CardToken
  }

  /**
   * Kart tipini tespit eder (VISA, MASTERCARD, vb.)
   */
  private detectCardType(cardNumber: string): string {
    // Basit bir kart tipi tespit algoritması
    if (cardNumber.startsWith("4")) {
      return "VISA"
    } else if (/^5[1-5]/.test(cardNumber)) {
      return "MASTERCARD"
    } else if (/^3[47]/.test(cardNumber)) {
      return "AMEX"
    } else if (/^9/.test(cardNumber)) {
      return "TROY"
    } else {
      return "UNKNOWN"
    }
  }

  /**
   * Banka API'sine ödeme isteği gönderir
   */
  private async processBankPayment(params: {
    transactionId: string
    amount: number
    currency: string
    cardDetails: any
    bankApiEndpoint: string
    bankApiKey?: string
    bankApiSecret?: string
    use3DSecure: boolean
    returnUrl: string
    installmentCount: number
    ipAddress: string
    userAgent: string
  }): Promise<{
    success: boolean
    transactionId?: string
    cardToken?: string
    redirectUrl?: string
    errorCode?: string
    errorMessage?: string
  }> {
    try {
      // Bu kısım gerçek banka entegrasyonuna göre değişecektir
      // Örnek bir implementasyon:

      const headers = {
        "Content-Type": "application/json",
        Authorization: `ApiKey ${params.bankApiKey}:${params.bankApiSecret}`,
      }

      const payload = {
        amount: params.amount,
        currency: params.currency,
        cardDetails: params.cardDetails,
        use3DSecure: params.use3DSecure,
        returnUrl: params.returnUrl,
        installmentCount: params.installmentCount,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        orderId: params.transactionId,
      }

      // Gerçek bir API çağrısı yerine simüle ediyoruz
      // const response = await fetch(params.bankApiEndpoint, {
      //   method: "POST",
      //   headers,
      //   body: JSON.stringify(payload),
      // })
      // const result = await response.json()

      // Simüle edilmiş başarılı yanıt
      const result = {
        success: true,
        transactionId: `sim_${Date.now()}`,
        cardToken: `token_${Date.now()}`,
        redirectUrl: params.use3DSecure
          ? `${params.returnUrl}?transactionId=${params.transactionId}&paymentId=${Date.now()}&status=success`
          : undefined,
      }

      return {
        success: true,
        transactionId: result.transactionId,
        cardToken: result.cardToken,
        redirectUrl: params.use3DSecure ? result.redirectUrl : undefined,
      }
    } catch (error: any) {
      console.error("Bank API error:", error)
      return {
        success: false,
        errorCode: "BANK_API_ERROR",
        errorMessage: error.message || "Banka API'si ile iletişim sırasında bir hata oluştu",
      }
    }
  }

  /**
   * 3D Secure sonucunu doğrular
   */
  private async verify3DSecurePayment(params: {
    bankApiEndpoint: string
    bankApiKey?: string
    bankApiSecret?: string
    paymentId: string
    bankResponseData: any
  }): Promise<{
    success: boolean
    errorCode?: string
    errorMessage?: string
  }> {
    try {
      // Bu kısım gerçek banka entegrasyonuna göre değişecektir
      // Örnek bir implementasyon:

      const headers = {
        "Content-Type": "application/json",
        Authorization: `ApiKey ${params.bankApiKey}:${params.bankApiSecret}`,
      }

      const payload = {
        paymentId: params.paymentId,
        responseData: params.bankResponseData,
      }

      // Gerçek bir API çağrısı yerine simüle ediyoruz
      // const response = await fetch(`${params.bankApiEndpoint}/verify3d`, {
      //   method: "POST",
      //   headers,
      //   body: JSON.stringify(payload),
      // })
      // const result = await response.json()

      // Simüle edilmiş başarılı yanıt
      const result = {
        success: true,
      }

      return {
        success: result.success,
        errorCode: result.success ? undefined : "VERIFICATION_FAILED",
        errorMessage: result.success ? undefined : "3D Secure doğrulama başarısız",
      }
    } catch (error: any) {
      console.error("3D Secure verification error:", error)
      return {
        success: false,
        errorCode: "3D_VERIFICATION_ERROR",
        errorMessage: error.message || "3D Secure doğrulama sırasında bir hata oluştu",
      }
    }
  }

  /**
   * Satıcıya bildirim oluşturur
   */
  private async createSellerNotification(sellerId: string, orderId: string): Promise<void> {
    await this.supabase.from("notifications").insert({
      user_id: sellerId,
      title: "Yeni Sipariş",
      content: `Yeni bir siparişiniz var! Sipariş ID: ${orderId}`,
      type: "ORDER",
      reference_id: orderId,
      is_read: false,
    })
  }
}
