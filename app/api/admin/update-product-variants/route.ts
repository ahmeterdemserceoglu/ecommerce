import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });

  // Admin authorization check
  const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession();
  if (sessionError) {
    console.error("[API /api/admin/update-product-variants POST] Error getting session:", sessionError.message);
    return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 });
  }
  if (!session) {
    console.log("[API /api/admin/update-product-variants POST] No session found.");
    return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 });
  }
  const { data: userProfile, error: profileError } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  if (profileError) {
    console.error(`[API /api/admin/update-product-variants POST] Error fetching profile for user ${session.user.id}:`, profileError.message);
    return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 });
  }
  if (!userProfile || userProfile.role !== 'admin') {
    console.warn(`[API /api/admin/update-product-variants POST] Authorization failed. User role: ${userProfile?.role} (Expected 'admin')`);
    return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 });
  }
  console.log(`[API /api/admin/update-product-variants POST] Admin user ${session.user.id} authorized.`);
  // End admin authorization check

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    // SQL dosyasını oku
    const sqlFilePath = path.join(process.cwd(), "lib/database/product-variants.sql");
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    // SQL komutlarını çalıştır
    const { error } = await supabaseAdmin.rpc("run_sql", { sql_query: sql });

    if (error) {
      console.error("Varyant tablosu oluşturulurken hata:", error)
      return NextResponse.json({ error: "Varyant tablosu oluşturulurken hata oluştu" }, { status: 500 })
    }

    return NextResponse.json(
      { message: "Varyant tablosu başarıyla oluşturuldu ve örnek veriler eklendi" },
      { status: 200 },
    )
  } catch (error) {
    console.error("Varyant tablosu oluşturulurken beklenmeyen hata:", error)
    return NextResponse.json({ error: "Varyant tablosu oluşturulurken beklenmeyen bir hata oluştu" }, { status: 500 })
  }
}
