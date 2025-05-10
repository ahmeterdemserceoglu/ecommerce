import { NextResponse, NextRequest } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase-admin"
import fs from "fs"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })

    // Standardized Admin authorization check
    const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession()
    if (sessionError) {
      console.error("[API /api/admin/update-payment-permissions POST] Error getting session:", sessionError.message)
      return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 })
    }
    if (!session) {
      console.log("[API /api/admin/update-payment-permissions POST] No session found.")
      return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 })
    }
    const { data: userProfile, error: profileError } = await supabaseAuth
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()
    if (profileError) {
      console.error(`[API /api/admin/update-payment-permissions POST] Error fetching profile for user ${session.user.id}:`, profileError.message)
      return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 })
    }
    if (!userProfile || userProfile.role !== "admin") {
      console.warn(`[API /api/admin/update-payment-permissions POST] Authorization failed. User role: ${userProfile?.role} (Expected 'admin')`)
      return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 })
    }
    console.log(`[API /api/admin/update-payment-permissions POST] Admin user ${session.user.id} authorized.`)
    // End standardized admin authorization check

    // Admin istemcisini oluştur
    const adminClient = createAdminClient()
    if (!adminClient) {
      return NextResponse.json(
        { error: "Admin istemcisi oluşturulamadı - SUPABASE_SERVICE_ROLE_KEY eksik olabilir" },
        { status: 500 },
      )
    }

    // SQL dosyasını oku
    const sqlFilePath = path.join(process.cwd(), "lib", "database", "card-tokens-permissions.sql")
    const sql = fs.readFileSync(sqlFilePath, "utf8")

    // SQL'i çalıştır
    const { error: sqlError } = await adminClient.rpc("exec_sql", { sql })

    if (sqlError) {
      console.error("SQL çalıştırılırken hata:", sqlError)
      return NextResponse.json({ error: "Ödeme izinleri güncellenirken hata oluştu" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Ödeme izinleri başarıyla güncellendi" })
  } catch (error) {
    console.error("Beklenmeyen hata:", error)
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 })
  }
}
