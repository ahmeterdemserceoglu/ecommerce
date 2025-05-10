import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Supabase client (SERVICE_ROLE_KEY ile) - Bu client admin işlemleri ve RLS bypass için kullanılabilir.
const supabaseAdminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Admin yetki kontrolü için yardımcı fonksiyon (Auth Helpers ile güncellendi)
async function isAdmin(req: NextRequest): Promise<boolean> {
    console.log("[isAdmin] Yetki kontrolü başlatılıyor...");
    try {
        const cookieStore = cookies();
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error("[isAdmin] Session alınırken hata:", sessionError.message);
            return false;
        }

        if (!session) {
            console.log("[isAdmin] Aktif session bulunamadı.");
            return false;
        }

        console.log(`[isAdmin] Session bulundu, kullanıcı ID: ${session.user.id}. Rol kontrolü için profil çekiliyor...`);
        const { data: profile, error: profileError } = await supabaseAdminClient // Admin client ile RLS'i bypass ederek rolü okuyalım
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (profileError) {
            console.error(`[isAdmin] Profil çekilirken hata (Kullanıcı ID: ${session.user.id}):`, profileError.message);
            return false;
        }

        if (!profile) {
            console.warn(`[isAdmin] Profil bulunamadı (Kullanıcı ID: ${session.user.id}). Yetkilendirme reddedildi.`);
            return false;
        }

        const userRole = profile.role;
        console.log(`[isAdmin] Kullanıcının rolü: ${userRole}`);

        if (userRole === 'admin') {
            console.log("[isAdmin] Yetkilendirme başarılı: Kullanıcı bir admin.");
            return true;
        }

        console.warn(`[isAdmin] Yetkilendirme başarısız. Beklenen rol: 'admin', Alınan rol: '${userRole}'.`);
        return false;
    } catch (error: any) {
        console.error("[isAdmin] Yetki kontrolü sırasında genel bir hata oluştu:", error.message);
        return false;
    }
}

const productSchema = z.object({
    name: z.string().min(3, "Ürün adı en az 3 karakter olmalı"),
    price: z.number().positive("Fiyat pozitif bir değer olmalı"),
    stock: z.number().int().min(0, "Stok adedi 0 veya daha büyük olmalı"),
    description: z.string().optional().nullable(),
    image_url: z.string().url("Geçerli bir görsel URL'i girin").optional().nullable(), // DB kolon adı: image_url
    category_id: z.string().uuid("Geçerli bir kategori ID'si girin").optional().nullable(), // DB kolon adı: category_id
    // status alanı backend'de yönetilecekse burada olmasına gerek yok, ya da admin tarafından set edilebilir.
    // status: z.enum(['pending', 'approved', 'rejected']).optional(), 
});

export async function GET(req: NextRequest) {
    console.log("[API /api/admin/products GET] İstek alındı.");
    try {
        if (!(await isAdmin(req))) {
            console.warn("[API /api/admin/products GET] Yetkisiz erişim denemesi.");
            return NextResponse.json({ success: false, error: { message: 'Yetkisiz erişim. Bu işlem için admin yetkisi gereklidir.' } }, { status: 403 });
        }
        console.log("[API /api/admin/products GET] Yetkilendirme başarılı.");

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const searchQuery = searchParams.get('search');
        const statusFilter = searchParams.get('status');
        const categoryIdFilter = searchParams.get('categoryId');

        const offset = (page - 1) * limit;

        let query = supabaseAdminClient
            .from('products')
            .select('*, category:categories(name)', { count: 'exact' }); // Kategori adını da çek

        if (searchQuery) {
            console.log(`[API /api/admin/products GET] Arama sorgusu: ${searchQuery}`);
            query = query.ilike('name', `%${searchQuery}%`);
        }
        if (statusFilter) {
            console.log(`[API /api/admin/products GET] Durum filtresi: ${statusFilter}`);
            query = query.eq('status', statusFilter);
        }
        if (categoryIdFilter) {
            console.log(`[API /api/admin/products GET] Kategori filtresi: ${categoryIdFilter}`);
            query = query.eq('category_id', categoryIdFilter);
        }

        query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

        const { data: productsData, error, count } = await query;

        if (error) {
            console.error('[API /api/admin/products GET] Supabase ürünler çekme hatası:', error);
            return NextResponse.json({ success: false, error: { message: error.message || 'Ürünler getirilirken bir veritabanı hatası oluştu.' } }, { status: 500 });
        }

        // `category` ilişkisi bir array dönebilir, ilk elemanı alalım veya null bırakalım.
        const products = productsData?.map(p => ({
            ...p,
            categoryName: p.category ? (Array.isArray(p.category) ? p.category[0]?.name : p.category.name) : null,
            // category: undefined // İsteğe bağlı olarak orijinal category nesnesini kaldırabilirsiniz.
        }));

        console.log(`[API /api/admin/products GET] ${products?.length} ürün başarıyla çekildi. Toplam: ${count}`);
        return NextResponse.json({
            success: true,
            data: products,
            meta: {
                currentPage: page,
                limit,
                totalCount: count ?? 0,
                totalPages: count ? Math.ceil(count / limit) : 0,
            }
        }, { status: 200 });

    } catch (err: any) {
        console.error('[API /api/admin/products GET] Genel Hata:', err);
        return NextResponse.json({ success: false, error: { message: err.message || 'Sunucuda beklenmedik bir hata oluştu.' } }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    console.log("[API /api/admin/products POST] İstek alındı.");
    try {
        if (!(await isAdmin(req))) {
            console.warn("[API /api/admin/products POST] Yetkisiz erişim denemesi.");
            return NextResponse.json({ success: false, error: { message: 'Yetkisiz erişim. Bu işlem için admin yetkisi gereklidir.' } }, { status: 403 });
        }
        console.log("[API /api/admin/products POST] Yetkilendirme başarılı.");

        const body = await req.json();
        const validationResult = productSchema.safeParse(body);

        if (!validationResult.success) {
            console.warn("[API /api/admin/products POST] Validasyon hatası:", validationResult.error.flatten().fieldErrors);
            return NextResponse.json({
                success: false,
                error: { message: 'Geçersiz ürün verisi.', details: validationResult.error.flatten().fieldErrors }
            }, { status: 400 });
        }
        console.log("[API /api/admin/products POST] Validasyon başarılı, veri:", validationResult.data);

        const { name, price, stock, description, image_url, category_id } = validationResult.data;

        const { data: newProduct, error } = await supabaseAdminClient
            .from('products')
            .insert([{
                name,
                price,
                stock,
                description,
                image_url,
                category_id,
                status: 'pending', // Yeni ürünler için varsayılan durum
            }])
            .select('*, category:categories(name)') // Kategori adını da çek
            .single();

        if (error) {
            console.error('[API /api/admin/products POST] Supabase ürün ekleme hatası:', error);
            if (error.code === '23505') { // unique_violation (örneğin SKU varsa)
                return NextResponse.json({ success: false, error: { message: 'Bu ürün kodu (SKU) veya benzersiz alan zaten mevcut.' } }, { status: 409 });
            }
            return NextResponse.json({ success: false, error: { message: error.message || 'Ürün oluşturulurken bir veritabanı hatası oluştu.' } }, { status: 500 });
        }

        const resultProduct = newProduct ? {
            ...newProduct,
            categoryName: newProduct.category ? (Array.isArray(newProduct.category) ? newProduct.category[0]?.name : newProduct.category.name) : null,
            // category: undefined
        } : null;

        console.log("[API /api/admin/products POST] Ürün başarıyla oluşturuldu, ID:", resultProduct?.id);
        return NextResponse.json({ success: true, data: resultProduct, message: 'Ürün başarıyla oluşturuldu.' }, { status: 201 });

    } catch (err: any) {
        console.error('[API /api/admin/products POST] Genel Hata:', err);
        return NextResponse.json({ success: false, error: { message: err.message || 'Sunucuda beklenmedik bir hata oluştu.' } }, { status: 500 });
    }
} 