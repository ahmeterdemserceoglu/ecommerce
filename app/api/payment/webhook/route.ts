import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { SupabaseClient } from "@supabase/supabase-js"; // Import SupabaseClient type

// Assume CartItem and CustomerDetails types are available or can be defined
// For example, from a shared types file or re-defined here if simple enough
interface WebhookCartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number; // Price at the time of checkout
  name: string; // Product name
  image?: string; // Product image path
  storeId: string; // Crucial for associating order item with a store
  // Add any other fields you stored with the cart that are needed for order_items
}
interface WebhookCustomerDetails {
  userId: string;
  email?: string;
  name?: string;
  phone?: string;
  addressId?: string | null; // ID of the selected address
  address_full_string?: string; // Full address string if addressId is not used
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const body = await request.json()
    // Iyzico typically sends data in a specific format, adjust access accordingly
    // Example: if Iyzico sends a direct payload, or nested under a `data` field.
    // For now, assuming body is the direct Iyzico payload for simplicity.
    // const { provider, event, data: iyzicoData } = body; // If structured like this

    // Directly use body if it's the Iyzico payload, or adjust as needed.
    // We need to extract Iyzico's conversationId (our paymentConversationId) and paymentId.
    // These field names might vary based on Iyzico's actual webhook payload.
    // Common Iyzico fields: paymentId, status, conversationId (or basketId)

    const iyzicoPaymentId = body.paymentId; // Iyzico's own transaction ID
    const paymentConversationId = body.conversationId || body.basketId; // Our reference ID
    const iyzicoStatus = body.status; // e.g., "SUCCESS", "FAILURE"

    console.log(`Iyzico Webhook alındı: Conversation ID: ${paymentConversationId}, Payment ID: ${iyzicoPaymentId}, Status: ${iyzicoStatus}`);

    if (!paymentConversationId || !iyzicoPaymentId || !iyzicoStatus) {
      console.error("Iyzico webhook eksik veri:", body);
      return NextResponse.json({ error: "Eksik Iyzico webhook verisi" }, { status: 400 });
    }

    // Sadece Iyzico ile devam ediyoruz bu örnekte
    if (body.paymentProcessor === "iyzico" || true) { // Assuming a way to identify it's from Iyzico or just processing all for now
      return await handleIyzicoWebhook(iyzicoPaymentId, paymentConversationId, iyzicoStatus, body, supabase);
    } else {
      return NextResponse.json({ error: "Unsupported payment provider or malformed request" }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Webhook işleme hatası:", error)
    return NextResponse.json({ error: "Webhook processing failed", details: error.message }, { status: 500 })
  }
}

async function handleIyzicoWebhook(
  iyzicoPaymentId: string,
  paymentConversationId: string,
  iyzicoStatus: string,
  webhookData: any, // Full webhook payload from Iyzico
  supabase: SupabaseClient // Typed Supabase client
) {
  // 1. Find the payment_transaction using our paymentConversationId
  const { data: transaction, error: transactionError } = await supabase
    .from("payment_transactions")
    .select("*, user_id, amount, currency, metadata, store_id") // Ensure metadata includes cartItems and customerDetails if stored directly
    .eq("payment_conversation_id", paymentConversationId)
    .single();

  if (transactionError || !transaction) {
    console.error(`Transaction bulunamadı (conversationId: ${paymentConversationId}):`, transactionError);
    // Iyzico might retry, so returning 200 might be okay if it's a temporary issue
    // or if the transaction was already processed.
    // If it's critical that it exists, return 404 or 400.
    return NextResponse.json({ error: "İlgili ödeme işlemi bulunamadı." }, { status: 404 });
  }

  // Idempotency: Check if this webhook (for this specific iyzicoPaymentId) was already processed
  if (transaction.status === "COMPLETED" || transaction.status === "FAILED") {
    if (transaction.provider_transaction_id === iyzicoPaymentId) {
      console.log(`Webhook for paymentId ${iyzicoPaymentId} (conversationId ${paymentConversationId}) zaten işlenmiş.`);
      return NextResponse.json({ success: true, message: "Webhook zaten işlenmiş." });
    }
  }

  let finalPaymentStatus = transaction.status;
  let orderCreationError = null;

  if (iyzicoStatus === "SUCCESS") {
    finalPaymentStatus = "COMPLETED";

    // ÖNEMLİ: Sipariş oluşturma mantığı
    // `transaction.metadata` içinde sepet ve müşteri detaylarını sakladıysanız oradan alın.
    // Ya da, `paymentConversationId` ile ilişkili geçici bir sepet tablosundan çekin.
    // Aşağısı bir örnek varsayımdır, kendi veri yapınıza göre uyarlayın.

    // const cartItemsForOrder: WebhookCartItem[] = transaction.metadata?.cartItems; // Varsayım
    // const customerDetailsForOrder: WebhookCustomerDetails = transaction.metadata?.customerDetails; // Varsayım

    // ---- GEÇİCİ OLARAK HARDCODED SEPET VE MÜŞTERİ BİLGİLERİ (TEST İÇİN) ----
    // GERÇEK VERİYİ YUKARIDAKİ GİBİ ALMALISINIZ!
    const { data: tempCartAndCustomer, error: tempError } = await getTemporaryCheckoutData(supabase, paymentConversationId);
    if (tempError || !tempCartAndCustomer) {
      console.error("Sipariş için geçici sepet/müşteri verisi alınamadı:", tempError);
      return NextResponse.json({ error: "Sipariş oluşturma için veri alınamadı" }, { status: 500 });
    }
    const { cartItemsForOrder, customerDetailsForOrder, totalAmountForOrder, shippingAddressId, shippingAddressString, billingAddressId, billingAddressString } = tempCartAndCustomer;
    // ---- BİTİŞ: GEÇİCİ OLARAK HARDCODED ----

    if (!cartItemsForOrder || cartItemsForOrder.length === 0 || !customerDetailsForOrder || !customerDetailsForOrder.userId) {
      console.error("Sipariş oluşturma için eksik sepet veya müşteri bilgisi (conversationId:", paymentConversationId, ")");
      finalPaymentStatus = "ERROR_DATA_MISSING"; // Custom status
      orderCreationError = "Sipariş için gerekli sepet/müşteri bilgileri eksik.";
    } else {
      try {
        const { data: newOrder, error: orderError } = await supabase
          .from("orders")
          .insert({
            user_id: customerDetailsForOrder.userId,
            total_amount: totalAmountForOrder, // transaction.amount kullanılabilir veya sepet toplamı
            subtotal_amount: totalAmountForOrder - (webhookData.shippingPrice || 15), // Kargo ücretini düş
            shipping_fee: webhookData.shippingPrice || 15, // Iyzico'dan gelmiyorsa varsayılan
            currency: transaction.currency,
            status: "processing", // Initial order status
            payment_status: "paid",
            address_id: shippingAddressId, // Seçilen adresin ID'si
            address_full: shippingAddressString, // Veya tam adres metni
            // billing_address_id: billingAddressId,
            // billing_address_full: billingAddressString,
            payment_method: transaction.payment_method,
            payment_provider: "iyzico",
            payment_transaction_id: transaction.id, // Bizim payment_transactions.id
            payment_conversation_id: paymentConversationId,
            // store_id: transaction.store_id, // Eğer tek satıcılı ise
          })
          .select("id, user_id, total_amount") // Oluşan order'ın id'sini al
          .single();

        if (orderError) throw orderError;

        const orderItemsToInsert = cartItemsForOrder.map((item: WebhookCartItem) => ({
          order_id: newOrder.id,
          product_id: item.productId,
          variant_id: item.variantId,
          quantity: item.quantity,
          price: item.price, // Ürünün o anki fiyatı
          store_id: item.storeId, // HER ÜRÜN İÇİN MAĞAZA ID
        }));

        const { error: orderItemsError } = await supabase.from("order_items").insert(orderItemsToInsert);
        if (orderItemsError) throw orderItemsError;

        // Stok Güncelleme (Her bir order item için)
        for (const item of cartItemsForOrder) {
          // Bu fonksiyonu implemente etmeniz gerekir: product_variants veya products tablosundan stok düşürür.
          // await decrementProductStock(supabase, item.productId, item.variantId, item.quantity);
        }

        // payment_transactions tablosundaki order_id'yi güncelle
        await supabase.from("payment_transactions").update({ order_id: newOrder.id }).eq("id", transaction.id);

        // Satıcılara bildirim gönder (her bir unique storeId için)
        const uniqueStoreIds = [...new Set(cartItemsForOrder.map(item => item.storeId))];
        for (const storeId of uniqueStoreIds) {
          if (storeId) {
            // Mağazanın kullanıcı ID'sini (owner_id) bulmanız gerekebilir.
            // const {data: storeOwner} = await supabase.from("stores").select("owner_id").eq("id", storeId).single();
            // if(storeOwner?.owner_id) {
            //    await createNotification(storeOwner.owner_id, "Yeni Sipariş", `Mağazanıza yeni bir sipariş geldi: ${newOrder.id}`, supabase);
            // }
          }
        }
        // Kullanıcıya bildirim
        await createNotification(newOrder.user_id, "Sipariş Alındı", `Siparişiniz (${newOrder.id}) başarıyla oluşturuldu.`, supabase);

        // Sepeti Temizle (Bu fonksiyonu implemente etmeniz gerekir, kullanıcının DB'deki sepetini temizler)
        // await clearUserCart(supabase, customerDetailsForOrder.userId);

      } catch (e: any) {
        console.error("Sipariş oluşturma sırasında HATA (conversationId:", paymentConversationId, "):", e);
        finalPaymentStatus = "ERROR_ORDER_CREATION"; // Custom status
        orderCreationError = e.message;
      }
    }
  } else if (iyzicoStatus === "FAILURE") {
    finalPaymentStatus = "FAILED";
  } else {
    console.warn(`Bilinmeyen Iyzico durumu: ${iyzicoStatus} (conversationId: ${paymentConversationId})`);
    finalPaymentStatus = "UNKNOWN_PROVIDER_STATUS";
  }

  // Update payment_transactions one last time with all details
  await supabase
    .from("payment_transactions")
    .update({
      status: finalPaymentStatus,
      provider_transaction_id: iyzicoPaymentId,
      provider_response: webhookData,
      updated_at: new Date().toISOString(),
      completed_at: finalPaymentStatus === "COMPLETED" ? new Date().toISOString() : null,
      error_message: orderCreationError || webhookData.errorMessage || transaction.error_message, // Preserve previous errors or add new ones
    })
    .eq("id", transaction.id);

  // Iyzico'ya her zaman [OK] dönmemiz gerekiyor (başarılı işlesek de işlemesek de retry etmemesi için)
  // Eğer spesifik bir hata kodu dönmeniz gerekiyorsa Iyzico dokümantasyonuna bakın.
  return new NextResponse("[OK]", { status: 200 });
}

// Placeholder for fetching temporary checkout data
// GERÇEK UYGULAMADA BU VERİYİ GÜVENLİ BİR ŞEKİLDE (DB VEYA CACHE) SAKLAMALI VE ÇEKMELİSİNİZ
// paymentConversationId ile initialize aşamasında sakladığınız sepet ve müşteri bilgilerini getirin.
async function getTemporaryCheckoutData(supabase: SupabaseClient, conversationId: string): Promise<any> {
  // Örnek: Bu ID ile bir "checkout_sessions" tablosundan veri çekebilirsiniz.
  // VEYA, eğer payment_transactions.metadata içine cartItems ve customerDetails kaydettiyseniz:
  const { data: transactionMeta, error } = await supabase
    .from("payment_transactions")
    .select("metadata, user_id, amount") // user_id ve amount'u da alalım
    .eq("payment_conversation_id", conversationId)
    .single();
  if (error || !transactionMeta) {
    console.error("getTemporaryCheckoutData - transactionMeta bulunamadı:", error);
    return { error: "İşlem meta verisi bulunamadı" };
  }

  // Adres bilgilerini de user_id üzerinden çekebiliriz (varsayılan adres vs.)
  const { data: addressData } = await supabase
    .from("user_addresses")
    .select("id, full_name, address, district, city, postal_code, country, phone")
    .eq("user_id", transactionMeta.user_id)
    .eq("is_default", true) // Ya da ödeme sırasında seçilen adresi başka bir yolla alın
    .single();

  const customerName = transactionMeta.metadata?.customerName || (addressData?.full_name) || 'Misafir Kullanıcı';

  // Bu çok basitleştirilmiş bir örnektir. Iyzico'ya gönderdiğiniz sepet ve müşteri detaylarını
  // paymentConversationId ile güvenli bir şekilde ilişkilendirip buradan çekmeniz gerekir.
  return {
    cartItemsForOrder: transactionMeta.metadata?.cartItems || [], // payment_transactions.metadata'dan gelmeli
    customerDetailsForOrder: {
      userId: transactionMeta.user_id,
      name: customerName,
      // ... diğer müşteri detayları ...
    },
    totalAmountForOrder: transactionMeta.amount, // transaction'dan gelen tutar
    shippingAddressId: addressData?.id || null,
    shippingAddressString: addressData ? `${addressData.full_name}, ${addressData.address}, ${addressData.district}, ${addressData.city}` : "Adres Yok",
    // billingAddressId ve billingAddressString benzer şekilde.
  };
}


async function createNotification(userId: string, title: string, content: string, supabase: SupabaseClient) {
  if (!userId) return;
  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    content,
    type: title.toLowerCase().replace(/\s+/g, '_'), // Simple type generation
    // reference_id: referenceId, // Eğer bir sipariş ID'si varsa eklenebilir
    is_read: false,
  })
}

// updateOrderStatus ve updatePaymentStatus fonksiyonları kaldırıldı, 
// mantıkları handleIyzicoWebhook içine yedirildi veya gereksizleşti.
