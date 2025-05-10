import { NextResponse, NextRequest } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// GET /api/orders - Kullanıcının veya tüm siparişleri listele (admin/seller yetkisine göre)
export async function GET(request: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const storeId = searchParams.get("store_id");
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    try {
        let query = supabase.from("orders").select("*, order_items(*), profiles(full_name, email), stores(name)");

        // Kullanıcı kendi siparişlerini sorguluyorsa
        if (userId && session.user.id === userId && session.user.role !== 'admin') {
            query = query.eq("user_id", userId);
        }
        // Satıcı kendi mağazasının siparişlerini sorguluyorsa
        else if (storeId && (session.user.role === 'seller' || session.user.role === 'admin')) {
            // Satıcının o mağazanın sahibi olup olmadığını kontrol et (admin değilse)
            if (session.user.role === 'seller') {
                const { data: storeData, error: storeError } = await supabase
                    .from("stores")
                    .select("id")
                    .eq("id", storeId)
                    .eq("user_id", session.user.id)
                    .single();

                if (storeError || !storeData) {
                    return NextResponse.json({ error: "Store not found or access denied" }, { status: 404 });
                }
            }
            query = query.eq("store_id", storeId);
        }
        // Admin tüm siparişleri sorgulayabilir (filtresiz veya user_id/store_id ile)
        else if (session.user.role === 'admin') {
            if (userId) query = query.eq("user_id", userId);
            if (storeId) query = query.eq("store_id", storeId);
        }
        // Yetkisiz veya eksik parametre durumu
        else {
            return NextResponse.json({ error: "Access Denied or missing parameters" }, { status: 403 });
        }

        query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

        const { data: orders, error } = await query;

        if (error) {
            console.error("Error fetching orders:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const { count } = await supabase
            .from("orders")
            .select('*', { count: 'exact', head: true })
            .eq(userId ? "user_id" : "1", userId || "1") // user_id varsa ona göre, yoksa genel count için dummy filtre
            .eq(storeId ? "store_id" : "1", storeId || "1"); // store_id varsa ona göre

        return NextResponse.json({ orders, count: count ?? 0 });
    } catch (e: any) {
        console.error("Error in GET /api/orders:", e);
        return NextResponse.json({ error: e.message || "Failed to fetch orders" }, { status: 500 });
    }
}

// POST /api/orders - Yeni sipariş oluştur
export async function POST(request: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const {
            user_id, // Genellikle session.user.id kullanılır, ama admin başkası adına oluşturabilir
            store_id,
            order_items, // [{ product_id, quantity, price, product_variant_id (opsiyonel) }]
            total_amount,
            shipping_fee,
            discount_amount = 0,
            address_id, // user_addresses tablosundan
            shipping_address_full, // address_id yoksa veya farklı bir adres ise
            billing_address_full, // opsiyonel
            order_note, // opsiyonel
            payment_method, // Ödeme yöntemi (örn: 'credit_card', 'bank_transfer')
            payment_transaction_id, // Ödeme başarılıysa, ödeme işlem ID'si
            status = "pending", // Varsayılan durum (örn: pending, paid, processing, shipped, delivered, cancelled)
            payment_status = "pending", // (örn: pending, paid, failed, refunded)
        } = body;

        // 1. Eksik alan kontrolü
        if (!user_id || !store_id || !order_items || order_items.length === 0 || !total_amount || !address_id && !shipping_address_full) {
            console.error("Sipariş oluşturma: Eksik alanlar", body);
            return NextResponse.json({ error: "Eksik alanlar var." }, { status: 400 });
        }

        // 0. Aynı sipariş var mı kontrolü
        const existingOrderQuery = supabase
            .from("orders")
            .select("id, status, order_items(product_id)")
            .eq("user_id", user_id)
            .in("status", ["pending", "awaiting_payment"]);
        const { data: existingOrders, error: existingOrderError } = await existingOrderQuery;
        if (!existingOrderError && existingOrders && existingOrders.length > 0) {
            // Her siparişin ürünlerini düzleştir
            const existingProductIds = new Set();
            existingOrders.forEach(order => {
                if (order.order_items) {
                    order.order_items.forEach(item => existingProductIds.add(item.product_id));
                }
            });
            // Yeni siparişteki ürünlerden herhangi biri mevcut siparişte var mı?
            const duplicate = order_items.some(item => existingProductIds.has(item.product_id));
            if (duplicate) {
                return NextResponse.json({ error: "Siparişiniz zaten var, ödemesini 'Siparişlerim' sayfasından tamamlayabilirsiniz.", code: "ORDER_ALREADY_EXISTS" }, { status: 409 });
            }
        }

        // 2. Komisyon oranını ayarlardan çek
        let commissionRate = 0.10;
        try {
            const { data: settings, error: settingsError } = await supabase.from("settings").select("commission_rate").maybeSingle();
            if (!settingsError && settings && typeof settings.commission_rate === "number") {
                commissionRate = settings.commission_rate;
            }
        } catch (err) {
            console.warn("Komisyon oranı ayarlardan alınamadı, varsayılan kullanılacak.", err);
        }

        // 3. Stok kontrolü ve fiyat doğrulama
        for (const item of order_items) {
            const { data: product, error: productError } = await supabase
                .from("products")
                .select("stock_quantity, price, discount_price, is_active")
                .eq("id", item.product_id)
                .single();
            if (productError || !product) {
                console.error("Sipariş oluşturma: Ürün bulunamadı", item.product_id, productError);
                return NextResponse.json({ error: `Ürün bulunamadı: ${item.product_id}` }, { status: 400 });
            }
            if (!product.is_active) {
                return NextResponse.json({ error: `Ürün aktif değil: ${item.product_id}` }, { status: 400 });
            }
            if (product.stock_quantity < item.quantity) {
                return NextResponse.json({ error: `Stok yetersiz: ${item.product_id}` }, { status: 400 });
            }
            // Fiyatı sunucu tarafında belirle
            const realPrice = product.discount_price ?? product.price;
            if (item.price !== realPrice) {
                return NextResponse.json({ error: `Fiyat uyuşmazlığı: ${item.product_id}` }, { status: 400 });
            }
        }

        // 4. Güvenlik: Sadece admin başkası adına user_id belirleyebilir.
        const finalUserId = session.user.role === 'admin' && user_id ? user_id : session.user.id;

        // 5. Adres bilgilerini çek (eğer address_id verildiyse)
        let finalShippingAddress = shipping_address_full;
        if (address_id) {
            const { data: addressData, error: addressError } = await supabase
                .from("user_addresses")
                .select("*")
                .eq("id", address_id)
                .eq("user_id", finalUserId)
                .single();
            if (addressError || !addressData) {
                return NextResponse.json({ error: "Adres bulunamadı veya kullanıcıya ait değil" }, { status: 404 });
            }
            finalShippingAddress = [
                addressData.full_name,
                addressData.address_line1,
                addressData.address_line2,
                addressData.district,
                addressData.city,
                addressData.postal_code,
                addressData.country,
                addressData.phone,
            ].filter(Boolean).join(", ");
        }

        // 6. Sipariş oluşturma
        const { data: newOrder, error: orderError } = await supabase
            .from("orders")
            .insert({
                user_id: finalUserId,
                store_id,
                total_amount,
                subtotal_amount: total_amount - (shipping_fee || 0) + (discount_amount || 0),
                shipping_fee: shipping_fee || 0,
                discount_amount: discount_amount || 0,
                address_id: address_id || null,
                shipping_address_full: finalShippingAddress,
                billing_address_full: billing_address_full || finalShippingAddress,
                order_note,
                payment_method,
                payment_transaction_id,
                status,
                payment_status,
            })
            .select()
            .single();

        if (orderError || !newOrder) {
            console.error("Sipariş oluşturulamadı:", orderError);
            return NextResponse.json({ error: orderError?.message || "Sipariş oluşturulamadı." }, { status: 500 });
        }

        // 7. Sipariş kalemlerini ekle
        const orderItemsToInsert = order_items.map((item: any) => ({
            order_id: newOrder.id,
            product_id: item.product_id,
            product_variant_id: item.product_variant_id || null,
            quantity: item.quantity,
            price: item.price, // Ürünün o anki fiyatı
            total_price: item.quantity * item.price,
            seller_amount: (item.price * item.quantity) * (1 - commissionRate), // Satıcıya ödenecek tutar (kuponsuz, komisyonlu)
        }));

        const { error: orderItemsError } = await supabase
            .from("order_items")
            .insert(orderItemsToInsert);

        if (orderItemsError) {
            console.error("Sipariş kalemleri eklenemedi, sipariş siliniyor:", orderItemsError);
            // Rollback: Oluşturulan siparişi sil
            await supabase.from("orders").delete().eq("id", newOrder.id);
            return NextResponse.json({ error: orderItemsError.message || "Sipariş kalemleri eklenemedi." }, { status: 500 });
        }

        // 8. Stok güncellemesi
        for (const item of order_items) {
            const { error: stockError } = await supabase.rpc("decrement_product_stock", {
                product_id_input: item.product_id,
                quantity_input: item.quantity,
            });
            if (stockError) {
                console.error("Stok güncellenemedi, sipariş ve kalemler siliniyor:", stockError);
                await supabase.from("order_items").delete().eq("order_id", newOrder.id);
                await supabase.from("orders").delete().eq("id", newOrder.id);
                return NextResponse.json({ error: "Stok güncellenemedi. Sipariş iptal edildi." }, { status: 500 });
            }
        }

        // TODO: Satıcıya ve müşteriye bildirim gönder

        return NextResponse.json({ order: { ...newOrder, order_items: orderItemsToInsert } }, { status: 201 });
    } catch (e: any) {
        console.error("Error in POST /api/orders:", e);
        return NextResponse.json({ error: "Sipariş oluşturulamadı. Lütfen tekrar deneyin." }, { status: 500 });
    }
} 