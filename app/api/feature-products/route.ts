import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST() {
    // 1. Tüm ürünlerde is_featured = false yap
    await supabase.from('products').update({ is_featured: false });

    // 2. Aktif ve onaylı ürünleri çek
    const { data: allProducts } = await supabase
        .from('products')
        .select('id')
        .eq('is_active', true)
        .eq('is_approved', true);

    if (!allProducts || allProducts.length === 0) {
        return NextResponse.json({ success: false, message: 'Hiç ürün yok.' });
    }

    // 3. Rastgele 10 ürün seç
    const shuffled = allProducts.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);
    const ids = selected.map(p => p.id);

    // 4. Seçilen ürünlerde is_featured = true yap
    if (ids.length > 0) {
        await supabase.from('products').update({ is_featured: true }).in('id', ids);
    }

    return NextResponse.json({ success: true, featured: ids });
} 