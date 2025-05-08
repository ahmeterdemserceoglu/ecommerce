import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase-admin"
import fs from "fs"
import path from "path"

export async function POST() {
  try {
    // Kullanıcı oturumunu kontrol et
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor" }, { status: 401 })
    }

    // Kullanıcının admin olup olmadığını kontrol et
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (userError || userData?.role !== "admin") {
      return NextResponse.json({ error: "Bu işlem için admin yetkisi gerekiyor" }, { status: 403 })
    }

    // Admin istemcisini oluştur
    const adminClient = createAdminClient()
    if (!adminClient) {
      return NextResponse.json(
        { error: "Admin istemcisi oluşturulamadı - SUPABASE_SERVICE_ROLE_KEY eksik olabilir" },
        { status: 500 },
      )
    }

    // SQL dosyasını oku
    const sqlFilePath = path.join(process.cwd(), "lib", "database", "fix-payment-tables.sql")
    const sql = fs.readFileSync(sqlFilePath, "utf8")

    // SQL'i çalıştır
    const { error: sqlError } = await adminClient.rpc("exec_sql", { sql })

    if (sqlError) {
      console.error("SQL çalıştırılırken hata:", sqlError)
      return NextResponse.json({ error: "Ödeme tabloları güncellenirken hata oluştu" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Ödeme tabloları başarıyla güncellendi" })
  } catch (error) {
    console.error("Beklenmeyen hata:", error)
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 })
  }
}
