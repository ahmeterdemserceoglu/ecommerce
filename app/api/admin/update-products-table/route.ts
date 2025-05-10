import { createClient } from "@supabase/supabase-js"
import { NextResponse, NextRequest } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// const supabaseAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); // Not needed if using service role for RPC

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });

  // Admin authorization check
  const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession();
  if (sessionError) {
    console.error("[API /api/admin/update-products-table POST] Error getting session:", sessionError.message);
    return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 });
  }
  if (!session) {
    console.log("[API /api/admin/update-products-table POST] No session found.");
    return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 });
  }
  const { data: userProfile, error: profileError } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  if (profileError) {
    console.error(`[API /api/admin/update-products-table POST] Error fetching profile for user ${session.user.id}:`, profileError.message);
    return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 });
  }
  if (!userProfile || userProfile.role !== 'admin') {
    console.warn(`[API /api/admin/update-products-table POST] Authorization failed. User role: ${userProfile?.role} (Expected 'admin')`);
    return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 });
  }
  console.log(`[API /api/admin/update-products-table POST] Admin user ${session.user.id} authorized.`);
  // End admin authorization check

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    // Ürün tablosunu güncelle
    const { error: productsError } = await supabaseAdmin.rpc("update_products_table", {
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
