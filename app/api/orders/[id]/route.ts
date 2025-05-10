import { NextResponse, NextRequest } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// GET /api/orders/[id] - Belirli bir siparişi getir
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createRouteHandlerClient({ cookies });
    const orderId = params.id;
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { data: order, error } = await supabase
            .from("orders")
            .select("*, order_items(*, products(name, image_url), product_variants(name, sku)), profiles(full_name, email), stores(name, slug)")
            .eq("id", orderId)
            .single();

        if (error) {
            console.error(`Error fetching order ${orderId}:`, error);
            return NextResponse.json({ error: "Order not found or error fetching" }, { status: 404 });
        }

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Yetki kontrolü: Kullanıcı kendi siparişini, satıcı kendi mağazasının siparişini, admin tüm siparişleri görebilir
        if (session.user.role !== 'admin') {
            if (session.user.role === 'seller' && order.store_id) {
                const { data: storeAuth, error: storeAuthError } = await supabase
                    .from("stores")
                    .select("id")
                    .eq("id", order.store_id)
                    .eq("user_id", session.user.id)
                    .single();
                if (storeAuthError || !storeAuth) {
                    return NextResponse.json({ error: "Access Denied to this order" }, { status: 403 });
                }
            } else if (order.user_id !== session.user.id) {
                return NextResponse.json({ error: "Access Denied to this order" }, { status: 403 });
            }
        }

        return NextResponse.json({ order });
    } catch (e: any) {
        console.error(`Error in GET /api/orders/${orderId}:`, e);
        return NextResponse.json({ error: e.message || "Failed to fetch order" }, { status: 500 });
    }
}

// PUT /api/orders/[id] - Belirli bir siparişi güncelle (durum, kargo vb.)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createRouteHandlerClient({ cookies });
    const orderId = params.id;
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const {
            status,
            payment_status,
            tracking_number,
            shipping_carrier,
            order_note, // Müşteri notu (admin/satıcı tarafından güncellenebilir)
            // Diğer güncellenebilir alanlar...
        } = body;

        // Hangi alanların güncellenebileceğini ve kimin güncelleyebileceğini belirle
        const updateData: any = {};
        if (status) updateData.status = status;
        if (payment_status) updateData.payment_status = payment_status;
        if (tracking_number) updateData.tracking_number = tracking_number;
        if (shipping_carrier) updateData.shipping_carrier = shipping_carrier;
        if (order_note) updateData.order_note = order_note;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        updateData.updated_at = new Date().toISOString();

        // Yetki kontrolü: Sadece admin veya siparişin ait olduğu mağazanın satıcısı güncelleyebilir.
        // Müşteriler siparişlerini belirli koşullarda (örn: iptal) güncelleyebilir, bu daha karmaşık bir mantık gerektirir.
        let canUpdate = false;
        if (session.user.role === 'admin') {
            canUpdate = true;
        }
        // Satıcı kendi mağazasının siparişini güncelleyebilir
        if (!canUpdate && session.user.role === 'seller') {
            const { data: orderData } = await supabase.from("orders").select("store_id").eq("id", orderId).single();
            if (orderData?.store_id) {
                const { data: storeData } = await supabase.from("stores").select("id").eq("id", orderData.store_id).eq("user_id", session.user.id).single();
                if (storeData) {
                    canUpdate = true;
                }
            }
        }
        // Kullanıcı belirli durumları güncelleyebilir (örneğin iptal isteği)
        if (!canUpdate && (status === 'cancelled' || status === 'cancellation_requested')) {
            const { data: orderData } = await supabase.from("orders").select("user_id, status").eq("id", orderId).single();
            // Sadece kendi siparişiyse ve mevcut durum iptale uygunsa
            if (orderData?.user_id === session.user.id && (orderData.status === 'pending' || orderData.status === 'paid' || orderData.status === 'processing')) {
                // Admin ve satıcılar durumu doğrudan 'cancelled' yapabilir, kullanıcı 'cancellation_requested' yapar.
                if (session.user.role !== 'admin' && session.user.role !== 'seller' && status === 'cancelled') {
                    updateData.status = 'cancellation_requested'; // Kullanıcı iptal talebinde bulunur
                }
                canUpdate = true;
            }
        }

        if (!canUpdate) {
            return NextResponse.json({ error: "You do not have permission to update this order or perform this status change." }, { status: 403 });
        }

        const { data: updatedOrder, error } = await supabase
            .from("orders")
            .update(updateData)
            .eq("id", orderId)
            .select("*, order_items(*)")
            .single();

        if (error) {
            console.error(`Error updating order ${orderId}:`, error);
            return NextResponse.json({ error: error.message || "Failed to update order" }, { status: 500 });
        }

        // TODO: Durum değişikliğinde bildirim gönder (müşteriye, satıcıya)
        // TODO: Eğer status 'shipped' ise ve tracking_number varsa, müşteriye kargo takip bildirimi.
        // TODO: Eğer status 'delivered' ise, değerlendirme isteği için bildirim.
        // TODO: Eğer status 'cancelled' veya 'refunded' ise, stok iadesi.

        return NextResponse.json({ order: updatedOrder });
    } catch (e: any) {
        console.error(`Error in PUT /api/orders/${orderId}:`, e);
        return NextResponse.json({ error: e.message || "Failed to update order" }, { status: 500 });
    }
}

// DELETE /api/orders/[id] - Belirli bir siparişi sil (sadece admin)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createRouteHandlerClient({ cookies });
    const orderId = params.id;
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session || session.user.role !== 'admin') {
        return NextResponse.json({ error: "Unauthorized: Only admins can delete orders." }, { status: 403 });
    }

    try {
        // Önce siparişe bağlı order_items kayıtlarını sil
        const { error: itemsError } = await supabase
            .from("order_items")
            .delete()
            .eq("order_id", orderId);

        if (itemsError) {
            console.error(`Error deleting order items for order ${orderId}:`, itemsError);
            return NextResponse.json({ error: itemsError.message || "Failed to delete order items" }, { status: 500 });
        }

        // Sonra siparişi sil
        const { error: orderError } = await supabase
            .from("orders")
            .delete()
            .eq("id", orderId);

        if (orderError) {
            console.error(`Error deleting order ${orderId}:`, orderError);
            // Eğer sipariş silinemezse (örn: foreign key constraint), order_items silme işlemini geri almak zor olabilir.
            // Bu durumda manuel müdahale gerekebilir veya daha karmaşık bir transaction yönetimi uygulanmalı.
            return NextResponse.json({ error: orderError.message || "Failed to delete order" }, { status: 500 });
        }

        // TODO: İlgili ödeme işlemlerini, iadeleri vb. kontrol et/güncelle.
        // Bu genellikle sipariş silmek yerine 'archived' gibi bir duruma getirmek daha güvenlidir.

        return NextResponse.json({ message: `Order ${orderId} and its items deleted successfully` });
    } catch (e: any) {
        console.error(`Error in DELETE /api/orders/${orderId}:`, e);
        return NextResponse.json({ error: e.message || "Failed to delete order" }, { status: 500 });
    }
} 