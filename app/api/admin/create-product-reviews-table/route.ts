import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST() {
  try {
    // Ürün değerlendirme tablosu
    const { error: reviewsError } = await supabase.rpc("create_product_reviews_table", {
      sql: `
        create table if not exists product_reviews (
          id uuid default uuid_generate_v4() primary key,
          product_id uuid references products(id) on delete cascade,
          user_id uuid references auth.users(id) on delete cascade,
          rating integer check (rating >= 1 and rating <= 5),
          title text,
          comment text,
          is_verified boolean default false,
          created_at timestamp with time zone default timezone('utc'::text, now()),
          updated_at timestamp with time zone default timezone('utc'::text, now())
        );

        -- RLS politikaları
        alter table product_reviews enable row level security;

        -- Herkes okuyabilir
        create policy "Herkes değerlendirmeleri okuyabilir"
        on product_reviews for select
        using (true);

        -- Sadece kendi değerlendirmelerini düzenleyebilir
        create policy "Kullanıcılar kendi değerlendirmelerini düzenleyebilir"
        on product_reviews for update
        using (auth.uid() = user_id);

        -- Sadece kendi değerlendirmelerini silebilir
        create policy "Kullanıcılar kendi değerlendirmelerini silebilir"
        on product_reviews for delete
        using (auth.uid() = user_id);

        -- Giriş yapmış kullanıcılar değerlendirme ekleyebilir
        create policy "Giriş yapmış kullanıcılar değerlendirme ekleyebilir"
        on product_reviews for insert
        with check (auth.uid() = user_id);

        -- Değerlendirme yanıtları tablosu
        create table if not exists review_responses (
          id uuid default uuid_generate_v4() primary key,
          review_id uuid references product_reviews(id) on delete cascade,
          user_id uuid references auth.users(id) on delete cascade,
          response text,
          created_at timestamp with time zone default timezone('utc'::text, now()),
          updated_at timestamp with time zone default timezone('utc'::text, now())
        );

        -- RLS politikaları
        alter table review_responses enable row level security;

        -- Herkes yanıtları okuyabilir
        create policy "Herkes yanıtları okuyabilir"
        on review_responses for select
        using (true);

        -- Sadece kendi yanıtlarını düzenleyebilir
        create policy "Kullanıcılar kendi yanıtlarını düzenleyebilir"
        on review_responses for update
        using (auth.uid() = user_id);

        -- Sadece kendi yanıtlarını silebilir
        create policy "Kullanıcılar kendi yanıtlarını silebilir"
        on review_responses for delete
        using (auth.uid() = user_id);

        -- Giriş yapmış kullanıcılar yanıt ekleyebilir
        create policy "Giriş yapmış kullanıcılar yanıt ekleyebilir"
        on review_responses for insert
        with check (auth.uid() = user_id);

        -- Ürün ortalama puanı için fonksiyon
        create or replace function update_product_rating()
        returns trigger as $$
        begin
          update products
          set rating = (
            select avg(rating)::numeric(3,2)
            from product_reviews
            where product_id = new.product_id
          ),
          review_count = (
            select count(*)
            from product_reviews
            where product_id = new.product_id
          )
          where id = new.product_id;
          return new;
        end;
        $$ language plpgsql;

        -- Trigger oluştur
        drop trigger if exists update_product_rating_trigger on product_reviews;
        create trigger update_product_rating_trigger
        after insert or update or delete on product_reviews
        for each row
        execute function update_product_rating();
      `,
    })

    if (reviewsError) {
      console.error("Error creating product reviews table:", reviewsError)
      return NextResponse.json({ error: reviewsError.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Product reviews table created successfully" })
  } catch (error: any) {
    console.error("Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
