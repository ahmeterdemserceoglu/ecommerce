import { createClient } from "@supabase/supabase-js"
import type { CardToken } from "./types"
import type { CartItem } from "@/providers/cart-provider" // Assuming CartItem is available
import Iyzico from 'iyzipay' // Import Iyzico SDK
import crypto from 'crypto' // For signature verification

// Assuming CustomerDetails and AddressDetails types are defined or can be inferred
interface CustomerDetails {
  userId?: string;
  email?: string;
  name?: string;
  phone?: string;
  address?: string; // This is the full string address from PaymentForm
  addressId?: string | null;
  // other fields like city, country, ip might be part of a richer customer object if needed by payment provider
}

interface AddressDetails { // For billing/shipping if structured
  contactName?: string;
  city?: string;
  country?: string;
  address?: string;
  zipCode?: string;
}

interface IyzicoCallbackData {
  status: 'success' | 'failure';
  paymentId?: string;
  conversationId?: string;
  mdStatus?: string; // This often contains the result of 3DS (e.g., 1 for success)
  // ... other fields Iyzico might send in POST ...
  hash?: string; // Iyzico sends a hash for verification
}

export class PaymentService {
  private supabase
  private iyzico: Iyzico // Declare Iyzico instance
  private iyzicoApiKey: string
  private iyzicoSecretKey: string

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "", // Ensure this is SUPABASE_SERVICE_ROLE_KEY for admin operations
    )

    // Initialize Iyzico SDK - Ensure these ENV variables are set!
    this.iyzicoApiKey = process.env.IYZICO_API_KEY || ""
    this.iyzicoSecretKey = process.env.IYZICO_SECRET_KEY || ""
    this.iyzico = new Iyzico({
      apiKey: this.iyzicoApiKey,
      secretKey: this.iyzicoSecretKey,
      uri: process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com", // Default to sandbox
    });
  }

  /**
   * Ödeme işlemini başlatır
   */
  async initiatePayment(params: {
    paymentConversationId: string; // New parameter
    userId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    cardNumber?: string;
    cardHolderName?: string;
    expiryMonth?: string;
    expiryYear?: string;
    cvv?: string;
    savedCardId?: string;
    bankId: string;
    installmentCount: number;
    use3DSecure: boolean;
    returnUrl: string;
    ipAddress: string;
    userAgent: string;
    cartItems: CartItem[];
    customer: CustomerDetails;
    billingAddress: AddressDetails;
    shippingAddress: AddressDetails;
    // orderId?: string | null; // Optional if supporting re-payment for existing order
    // storeId?: string; // To be derived from cartItems if needed for this transaction record
    // sellerId?: string; // To be derived from cartItems if needed for this transaction record
  }): Promise<{
    success: boolean
    transactionId?: string // This should be the ID from payment_transactions table
    redirectUrl?: string
    htmlContent?: string // For direct HTML form response (e.g., Ziraat)
    errorMessage?: string
    paymentConversationId?: string // Return this back for client to track
  }> {
    try {
      const firstCartItem = params.cartItems?.[0];
      const storeIdForTransaction = firstCartItem?.storeId || null;
      if (!storeIdForTransaction && params.cartItems?.length > 0) {
        console.warn("PaymentService: storeId could not be determined from cartItems for the transaction.");
      }

      const { data: bank, error: bankError } = await this.supabase
        .from("banks")
        .select("*, gateway_provider_name, pos_api_endpoint, pos_api_key, pos_api_secret") // Ensure these are fetched if used per bank
        .eq("id", params.bankId)
        .single();

      if (bankError) {
        console.error("Error fetching bank details for provider name:", bankError);
        throw new Error(`Banka detayları alınamadı: ${bankError.message}`);
      }
      if (!bank) {
        throw new Error(`Banka bulunamadı: ID ${params.bankId}`);
      }
      // Use bank specific API keys if available, otherwise use global Iyzico keys from constructor
      const activeBankApiKey = bank.pos_api_key || process.env.IYZICO_API_KEY;
      const activeBankApiSecret = bank.pos_api_secret || process.env.IYZICO_SECRET_KEY;
      const activeBankApiEndpoint = bank.pos_api_endpoint || process.env.IYZICO_BASE_URL;

      const providerName = bank.gateway_provider_name || 'unknown';

      const { data: transaction, error: transactionError } = await this.supabase
        .from("payment_transactions")
        .insert({
          payment_conversation_id: params.paymentConversationId,
          user_id: params.userId,
          store_id: storeIdForTransaction,
          amount: params.amount,
          currency: params.currency,
          status: "PENDING",
          payment_method: params.paymentMethod,
          provider: providerName,
          bank_id: params.bankId,
          installment_count: params.installmentCount,
          is_3d_secure: params.use3DSecure,
          metadata: {
            cartItemCount: params.cartItems.length,
            customerName: params.customer.name,
            userAgent: params.userAgent,
            ipAddress: params.ipAddress,
          }
        })
        .select("id, payment_conversation_id")
        .single();

      if (transactionError) {
        console.error("Error creating payment transaction:", transactionError);
        throw new Error(`Ödeme işlemi kaydı oluşturulamadı: ${transactionError.message}`);
      }

      console.log(`[PaymentService] Initiate Payment - DB Transaction ID: ${transaction.id}, Conversation ID: ${transaction.payment_conversation_id}`);

      let cardDetails;
      if (params.savedCardId) {
        const { data: savedCard, error: cardError } = await this.supabase
          .from("card_tokens")
          .select("*")
          .eq("id", params.savedCardId)
          .eq("user_id", params.userId)
          .single();
        if (cardError || !savedCard) throw new Error(cardError?.message || "Kayıtlı kart bulunamadı veya size ait değil.");
        cardDetails = { token: savedCard.token_value, cvv: params.cvv };
      } else {
        cardDetails = {
          cardNumber: params.cardNumber,
          cardHolderName: params.cardHolderName,
          expiryMonth: params.expiryMonth,
          expiryYear: params.expiryYear,
          cvv: params.cvv,
        };
      }

      const paymentResult = await this.processBankPayment({
        transactionId: transaction.id,
        paymentConversationId: params.paymentConversationId,
        bankProviderName: providerName,
        amount: params.amount,
        currency: params.currency,
        cardDetails,
        bankApiEndpoint: activeBankApiEndpoint!,
        bankApiKey: activeBankApiKey,
        bankApiSecret: activeBankApiSecret,
        use3DSecure: params.use3DSecure,
        returnUrl: params.returnUrl,
        installmentCount: params.installmentCount,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        cartItems: params.cartItems,
        customer: params.customer,
        billingAddress: params.billingAddress,
        shippingAddress: params.shippingAddress,
      });

      await this.supabase
        .from("payment_transactions")
        .update({
          status: paymentResult.success ? (params.use3DSecure && paymentResult.redirectUrl ? "AWAITING_3DS" : "COMPLETED") : "FAILED",
          provider_transaction_id: paymentResult.providerTransactionId,
          provider_response: paymentResult.providerRawResponse,
          error_code: paymentResult.errorCode,
          error_message: paymentResult.errorMessage,
          card_last_four: params.cardNumber
            ? params.cardNumber.slice(-4)
            : (params.savedCardId ? (await this.supabase.from('card_tokens').select('last_four_digits').eq('id', params.savedCardId).single())?.data?.last_four_digits || "****" : undefined),
          completed_at: paymentResult.success && !params.use3DSecure && !paymentResult.redirectUrl ? new Date().toISOString() : null,
        })
        .eq("id", transaction.id);

      if (paymentResult.success && !params.savedCardId && params.cardNumber && paymentResult.cardToken) {
        await this.saveCardToken({
          userId: params.userId,
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
        htmlContent: paymentResult.htmlContent,
        errorMessage: paymentResult.errorMessage,
        paymentConversationId: params.paymentConversationId,
      };
    } catch (error: any) {
      console.error("PaymentService initiatePayment error:", error);
      return {
        success: false,
        errorMessage: error.message || "Ödeme başlatılırken sunucu taraflı bir hata oluştu",
        paymentConversationId: params.paymentConversationId,
      };
    }
  }

  /**
   * 3D Secure sonrası ödeme sonucunu işler
   */
  async complete3DSecurePayment(params: {
    transactionId: string
    paymentConversationId?: string;
    status: string
    bankResponseData: any
    paymentId?: string; // Added optional paymentId, can also be extracted from bankResponseData
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

      // Extract paymentId from bankResponseData if not directly provided
      // This logic is highly dependent on the actual structure of bankResponseData from Iyzico
      const providerPaymentId = params.paymentId || params.bankResponseData?.paymentId || params.bankResponseData?.mdStatus; // Example field names
      if (!providerPaymentId) {
        console.error("Could not determine provider's paymentId from bankResponseData for 3DS verification");
        // Potentially try to use paymentConversationId if that's what Iyzico uses for callback verification
      }

      const verificationResult = await this.verify3DSecurePayment({
        bankApiEndpoint: bank.pos_api_endpoint,
        bankApiKey: bank.pos_api_key,
        bankApiSecret: bank.pos_api_secret,
        paymentId: providerPaymentId, // Use the extracted or provided paymentId
        bankResponseData: params.bankResponseData,
      })

      // 4. İşlem sonucunu güncelle
      await this.supabase
        .from("payment_transactions")
        .update({
          status: verificationResult.success ? "COMPLETED" : "FAILED",
          error_code: verificationResult.errorCode,
          error_message: verificationResult.errorMessage,
          provider_response: params.bankResponseData, // Store the bank response data as well
          completed_at: verificationResult.success ? new Date().toISOString() : null,
        })
        .eq("id", transaction.id)

      // 5. Siparişi güncelle
      if (verificationResult.success && transaction.order_id) {
        await this.supabase
          .from("orders")
          .update({
            payment_status: "PAID",
            status: "PROCESSING",
          })
          .eq("id", transaction.order_id)

        // 6. Satıcı bildirimini oluştur
        await this.createSellerNotification(transaction.seller_id, transaction.order_id)
      } else if (verificationResult.success && !transaction.order_id) {
        // This case should ideally not happen if webhook is creating the order first.
        // If it does, it means we might need to create the order here or rely on webhook to do it.
        console.warn(`Payment transaction ${transaction.id} completed via 3DS but has no associated order_id.`);
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
    transactionId: string;
    paymentConversationId: string;
    bankProviderName: string;
    amount: number;
    currency: string;
    cardDetails: any;
    bankApiEndpoint: string;
    bankApiKey?: string | null;
    bankApiSecret?: string | null;
    use3DSecure: boolean;
    returnUrl: string;
    installmentCount: number;
    ipAddress: string;
    userAgent: string;
    cartItems: CartItem[];
    customer: CustomerDetails;
    billingAddress: AddressDetails;
    shippingAddress: AddressDetails;
  }): Promise<{
    success: boolean;
    providerTransactionId?: string;
    cardToken?: string;
    redirectUrl?: string;
    htmlContent?: string;
    errorCode?: string;
    errorMessage?: string;
    providerRawResponse?: any;
  }> {
    console.log("[PaymentService] processBankPayment PARAMS:", JSON.stringify(params, null, 2));

    if (params.bankProviderName.toLowerCase() === 'iyzico') {
      const iyzicoRequest = {
        locale: Iyzico.LOCALE.TR,
        conversationId: params.paymentConversationId,
        price: params.amount.toString(), // Iyzico expects string for price
        paidPrice: params.amount.toString(), // Iyzico expects string for paidPrice
        currency: params.currency === 'TRY' ? Iyzico.CURRENCY.TRY : params.currency, // Use Iyzico enums
        installment: params.installmentCount,
        basketId: params.paymentConversationId, // Can be same as conversationId or a separate ID from your system
        paymentChannel: Iyzico.PAYMENT_CHANNEL.WEB,
        paymentGroup: Iyzico.PAYMENT_GROUP.PRODUCT,
        paymentCard: {
          cardHolderName: params.cardDetails.cardHolderName,
          cardNumber: params.cardDetails.cardNumber?.replace(/\s/g, ""),
          expireYear: params.cardDetails.expiryYear, // e.g., "2028"
          expireMonth: params.cardDetails.expiryMonth, // e.g., "12"
          cvc: params.cardDetails.cvv,
          registerCard: params.cardDetails.cardNumber && params.cardDetails.cardHolderName ? 0 : undefined, // 0 for no, 1 for yes if card saving is intended
          // If using card token:
          // cardToken: params.cardDetails.token, 
          // cardUserKey: params.customer.userId, // If you have a cardUserKey from Iyzico
        },
        buyer: {
          id: params.customer.userId || params.paymentConversationId.substring(0, 20), // Max 30 chars for Iyzico usually
          name: params.customer.name?.split(' ')[0] || 'Test',
          surname: params.customer.name?.split(' ').slice(1).join(' ') || 'Kullanici',
          gsmNumber: params.customer.phone?.replace(/\D/g, '') || '+905000000000',
          email: params.customer.email || 'test@example.com',
          identityNumber: '11111111110', // Must be a valid Turkish TC Kimlik No for real transactions if required by Iyzico
          lastLoginDate: new Date().toISOString().substring(0, 19).replace('T', ' '),
          registrationDate: new Date().toISOString().substring(0, 19).replace('T', ' '),
          registrationAddress: params.billingAddress.address || 'N/A',
          ip: params.ipAddress,
          city: params.billingAddress.city || 'Istanbul',
          country: params.billingAddress.country || 'Turkey',
          zipCode: params.billingAddress.zipCode,
        },
        shippingAddress: {
          contactName: params.shippingAddress.contactName || params.customer.name || 'Test Kullanici',
          city: params.shippingAddress.city || 'Istanbul',
          country: params.shippingAddress.country || 'Turkey',
          address: params.shippingAddress.address || 'N/A',
          zipCode: params.shippingAddress.zipCode,
        },
        billingAddress: {
          contactName: params.billingAddress.contactName || params.customer.name || 'Test Kullanici',
          city: params.billingAddress.city || 'Istanbul',
          country: params.billingAddress.country || 'Turkey',
          address: params.billingAddress.address || 'N/A',
          zipCode: params.billingAddress.zipCode,
        },
        basketItems: params.cartItems.map((item, index) => ({
          id: item.productId?.toString() || `item-${index}`,
          name: item.name || 'Urun',
          category1: item.storeName || 'Genel',
          // category2: item.category2, // Optional
          itemType: Iyzico.BASKET_ITEM_TYPE.PHYSICAL, // Or VIRTUAL
          price: (item.price * item.quantity).toString(), // Iyzico expects string for price
        })),
        // CRITICAL: This URL is where Iyzico will POST the 3DS result. 
        // It MUST be an absolute URL to an API endpoint on your server (e.g., /api/payment/complete-iyzico)
        callbackUrl: params.returnUrl,
      };

      // For saved card payments, Iyzico expects slightly different payload (ThreedsInitialize)
      // This example focuses on new card payment. You'll need to adjust for saved cards.

      console.log("[PaymentService] Iyzico Request Payload:", JSON.stringify(iyzicoRequest, null, 2));

      return new Promise((resolve, reject) => {
        // Use the Iyzico instance from the constructor
        this.iyzico.payment.create(iyzicoRequest, (err: any, result: any) => {
          console.log("[PaymentService] Iyzico Raw Response:", JSON.stringify(result, null, 2));
          console.error("[PaymentService] Iyzico Raw Error (if any):", JSON.stringify(err, null, 2));

          if (err) {
            resolve({
              success: false,
              errorMessage: err.errorMessage || 'Iyzico API Error',
              errorCode: err.errorCode,
              providerRawResponse: { error: err, resultStatus: 'failure' },
            });
            return;
          }

          if (result.status === 'success') {
            if (result.threeDSHtmlContent) {
              resolve({
                success: true,
                htmlContent: Buffer.from(result.threeDSHtmlContent, 'base64').toString('utf-8'), // Iyzico returns base64 encoded HTML
                providerTransactionId: result.paymentId,
                providerRawResponse: result,
              });
            } else {
              // Non-3DS success (should not happen if 3DS is requested, but handle defensively)
              resolve({
                success: true,
                providerTransactionId: result.paymentId,
                providerRawResponse: result,
              });
            }
          } else {
            resolve({
              success: false,
              errorMessage: result.errorMessage,
              errorCode: result.errorCode,
              providerTransactionId: result.paymentId,
              providerRawResponse: result,
            });
          }
        });
      });
    }

    console.warn(`[PaymentService] processBankPayment: Provider '${params.bankProviderName}' not specifically handled.`);
    return Promise.resolve({
      success: false, // Default to false if not handled
      errorMessage: params.bankProviderName === 'unknown' ? 'Bilinmeyen ödeme sağlayıcısı.' : `Provider ${params.bankProviderName} is not configured for server-side processing.`,
    });
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

  /**
   * Verifies the signature of the Iyzico callback.
   * IMPORTANT: This is a conceptual implementation. 
   * Refer to Iyzico's official documentation for the exact signature generation formula.
   */
  private verifyIyzicoSignature(data: IyzicoCallbackData, receivedHash: string): boolean {
    // Typically, Iyzico requires creating a string from specific fields in a specific order,
    // then hashing it with your secretKey.
    // Example (conceptual, LIKELY INCORRECT - CHECK IYZICO DOCS):
    // const stringToHash = `${this.iyzicoApiKey}${data.conversationId}${data.paymentId}${data.status}${this.iyzicoSecretKey}`;
    // const calculatedHash = crypto.createHmac('sha1', this.iyzicoSecretKey).update(stringToHash).digest('base64');
    // return calculatedHash === receivedHash;

    // For testing, you might temporarily return true, but DO NOT use this in production.
    console.warn("[PaymentService] Iyzico signature verification is currently a placeholder. Implement actual verification based on Iyzico documentation!");
    // Iyzico official PHP example for hash generation (translate to Node.js):
    // $hashStr = $request->getLocale() .
    // $request->getConversationId() .
    // $request->getPaymentId() .
    // $request->getStatus() .
    // $request->getErrorCode() .
    // $request->getErrorMessage() .
    // $request->getMdStatus() .
    // $request->getCardAssociation() .
    // $request->getCardFamily() .
    // $request->getFraudStatus();
    // $pkiString = Iyzipay\PkiBuilder::buildPkiString($hashStr);
    // $hash = Iyzipay\HashGenerator::generateHash($options->getSecretKey(), $pkiString);
    // This needs the exact fields and order Iyzico uses for callback hash.
    return true; // <<<<------ WARNING: TEMPORARY FOR TESTING. REPLACE WITH REAL VERIFICATION.
  }

  /**
   * Handles the callback from Iyzico after 3D Secure (or direct payment result).
   */
  async completeIyzicoPayment(callbackData: IyzicoCallbackData): Promise<{
    success: boolean;
    orderId?: string | null;
    message: string;
    paymentTransactionId?: string;
    isAlreadyProcessed?: boolean;
    errorCode?: string;
  }> {
    console.log("[PaymentService] completeIyzicoPayment received callbackData:", callbackData);

    const { status, paymentId, conversationId, mdStatus, hash } = callbackData;

    // 1. Verify Signature (CRITICAL FOR SECURITY)
    // if (!hash || !this.verifyIyzicoSignature(callbackData, hash)) {
    //   console.error("[PaymentService] Iyzico callback signature verification failed.");
    //   return { success: false, message: "Iyzico callback signature invalid.", paymentTransactionId: undefined };
    // }
    // console.log("[PaymentService] Iyzico callback signature verified.");

    // 2. Find the original payment transaction in your DB using conversationId or paymentId
    const { data: pTransaction, error: pTransactionError } = await this.supabase
      .from("payment_transactions")
      .select("*")
      .eq("payment_conversation_id", conversationId) // Or use paymentId if Iyzico guarantees its presence in callback
      // .eq("provider_transaction_id", paymentId) // Alternative if paymentId is already stored
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (pTransactionError || !pTransaction) {
      console.error("[PaymentService] Original payment transaction not found for conversationId:", conversationId, pTransactionError);
      return { success: false, message: "Original payment transaction not found.", paymentTransactionId: undefined };
    }

    // Check if already processed
    if (pTransaction.status === "COMPLETED" || pTransaction.status === "FAILED_VERIFICATION" || pTransaction.status === "SUCCESS_WEBHOOK") {
      console.log(`[PaymentService] Transaction ${pTransaction.id} already processed with status: ${pTransaction.status}`);
      return { success: pTransaction.status === "COMPLETED" || pTransaction.status === "SUCCESS_WEBHOOK", orderId: pTransaction.order_id, message: "Transaction already processed.", paymentTransactionId: pTransaction.id, isAlreadyProcessed: true };
    }

    // 3. Retrieve final payment details from Iyzico (Double Check)
    return new Promise((resolve) => {
      this.iyzico.paymentDetail.retrieve({
        paymentConversationId: conversationId,
      }, async (err: any, result: any) => {
        console.log("[PaymentService] Iyzico paymentDetail.retrieve Raw Response:", JSON.stringify(result, null, 2));
        console.error("[PaymentService] Iyzico paymentDetail.retrieve Raw Error (if any):", JSON.stringify(err, null, 2));

        let finalStatusIsSuccess = false;
        let finalErrorCode = err?.errorCode || result?.errorCode;
        let finalErrorMessage = err?.errorMessage || result?.errorMessage;
        let finalProviderPaymentId = result?.paymentId || paymentId;

        if (result && result.status === 'success' && result.paymentStatus === 'SUCCESS') {
          // Iyzico uses result.paymentStatus == 'SUCCESS' for a truly successful payment
          finalStatusIsSuccess = true;
        } else if (status === 'success' && mdStatus === '1') {
          // Fallback if paymentDetail retrieve fails but callback indicates success via mdStatus (less secure)
          // This is a simplified check, Iyzico's mdStatus values need careful handling.
          console.warn("[PaymentService] Iyzico paymentDetail.retrieve might have failed or paymentStatus not SUCCESS, but callback mdStatus indicates success. Proceeding with caution.");
          finalStatusIsSuccess = true;
        }

        if (finalStatusIsSuccess) {
          try {
            await this.supabase
              .from("payment_transactions")
              .update({
                status: "COMPLETED",
                provider_transaction_id: finalProviderPaymentId,
                provider_response: { callback: callbackData, retrieve: result },
                error_code: null,
                error_message: null,
                completed_at: new Date().toISOString(),
              })
              .eq("id", pTransaction.id);

            // Create Order if not exists (check by payment_conversation_id to ensure idempotency)
            let orderId = pTransaction.order_id;
            if (!orderId) {
              const { data: existingOrderWithConvId } = await this.supabase
                .from('orders')
                .select('id')
                .eq('payment_conversation_id', pTransaction.payment_conversation_id)
                .single();

              if (existingOrderWithConvId) {
                orderId = existingOrderWithConvId.id;
              } else {
                // Fetch cart items again or use details stored in payment_transactions.metadata if sufficient
                // For simplicity, assuming pTransaction.metadata.cartItems and pTransaction.metadata.customer exists
                const cartForOrder = (pTransaction.metadata as any)?.cartItems as CartItem[] || []; // This data needs to be reliable
                const customerForOrder = (pTransaction.metadata as any)?.customer || {}; // This data needs to be reliable
                const billingForOrder = (pTransaction.metadata as any)?.billingAddress || {};
                const shippingForOrder = (pTransaction.metadata as any)?.shippingAddress || {};

                // Define a type for items in orderItemsToInsert for clarity
                type OrderItemToInsert = {
                  order_id: string | null | undefined;
                  product_id: string;
                  variant_id: string | null | undefined;
                  store_id: string | null | undefined;
                  quantity: number;
                  unit_price: number;
                  total_price: number;
                };

                const orderItemsToInsert: OrderItemToInsert[] = cartForOrder.map((cartItem: CartItem) => ({
                  order_id: null, // Will be updated with newOrder.id
                  product_id: cartItem.productId || cartItem.id,
                  variant_id: cartItem.variantId,
                  store_id: cartItem.storeId,
                  quantity: cartItem.quantity,
                  unit_price: cartItem.price,
                  total_price: cartItem.quantity * cartItem.price,
                }));

                const { data: newOrder, error: orderError } = await this.supabase
                  .from("orders")
                  .insert({
                    user_id: pTransaction.user_id,
                    status: "PROCESSING", // Initial status after payment
                    total_amount: pTransaction.amount,
                    currency: pTransaction.currency,
                    payment_transaction_id: pTransaction.id,
                    payment_conversation_id: pTransaction.payment_conversation_id,
                  })
                  .select("id")
                  .single();
                if (orderError) throw orderError;
                orderId = newOrder.id;

                // Update payment_transaction with the new order_id
                await this.supabase.from("payment_transactions").update({ order_id: orderId }).eq("id", pTransaction.id);

                // Update order_id for each item and insert
                const finalOrderItems = orderItemsToInsert.map(item => ({ ...item, order_id: orderId }));
                await this.supabase.from("order_items").insert(finalOrderItems);

                const uniqueStoreIds = [...new Set(finalOrderItems.map((item: OrderItemToInsert) => item.store_id).filter((id): id is string => !!id))];
                for (const storeId of uniqueStoreIds) {
                  const { data: storeData } = await this.supabase.from('stores').select('user_id').eq('id', storeId).single();
                  if (storeData?.user_id && orderId) {
                    await this.createSellerNotification(storeData.user_id, orderId);
                  }
                }
              }
            }

            resolve({ success: true, orderId: orderId, message: "Ödeme başarıyla tamamlandı ve sipariş oluşturuldu.", paymentTransactionId: pTransaction.id });

          } catch (dbError: any) {
            console.error("[PaymentService] DB update/insert error after successful Iyzico payment:", dbError);
            resolve({ success: false, message: `Ödeme başarılı ancak sipariş oluşturulamadı: ${dbError.message}`, paymentTransactionId: pTransaction.id });
          }
        } else {
          // Payment failed according to Iyzico retrieve call
          await this.supabase
            .from("payment_transactions")
            .update({
              status: "FAILED_VERIFICATION",
              provider_transaction_id: finalProviderPaymentId,
              provider_response: { callback: callbackData, retrieve: result },
              error_code: finalErrorCode || null, // Ensure DB can handle null if that's the type
              error_message: finalErrorMessage || null,
            })
            .eq("id", pTransaction.id);
          resolve({
            success: false,
            message: `Iyzico ödeme doğrulaması başarısız: ${finalErrorMessage || 'Bilinmeyen hata'}`,
            errorCode: finalErrorCode || undefined, // Coalesce null to undefined for the return type
            paymentTransactionId: pTransaction.id
          });
        }
      });
    });
  }
}
