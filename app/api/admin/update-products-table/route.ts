import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST() {
  try {
    // Ürün tablosunu güncelle
    const { error: productsError } = await supabase.rpc("update_products_table", {
      sql: `
        -- Rating ve review_count alanlarını ekle
        alter table products
        add column if not exists rating numeric(3,2) default 0,
        add column if not exists review_count integer default 0;

        -- RLS politikaları
        alter table products enable row level security;

        -- Herkes okuyabilir
        create policy "Herkes ürünleri okuyabilir"
        on products for select
        using (true);

        -- Sadece mağaza sahipleri kendi ürünlerini düzenleyebilir
        create policy "Mağaza sahipleri kendi ürünlerini düzenleyebilir"
        on products for update
        using (
          auth.uid() in (
            select user_id
            from stores
            where id = store_id
          )
        );

        -- Sadece mağaza sahipleri kendi ürünlerini silebilir
        create policy "Mağaza sahipleri kendi ürünlerini silebilir"
        on products for delete
        using (
          auth.uid() in (
            select user_id
            from stores
            where id = store_id
          )
        );

        -- Sadece mağaza sahipleri ürün ekleyebilir
        create policy "Mağaza sahipleri ürün ekleyebilir"
        on products for insert
        with check (
          auth.uid() in (
            select user_id
            from stores
            where id = store_id
          )
        );
      `,
    })

    if (productsError) {
      console.error("Error updating products table:", productsError)
      return NextResponse.json({ error: productsError.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Products table updated successfully" })
  } catch (error: any) {
    console.error("Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
