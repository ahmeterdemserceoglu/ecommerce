import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import fs from "fs"
import path from "path"

export async function POST(request: Request) {
  try {
    // Kullanıcı yetkisini kontrol et
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor" }, { status: 401 })
    }

    // Kullanıcının admin olup olmadığını kontrol et
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json({ error: "Bu işlem için admin yetkisi gerekiyor" }, { status: 403 })
    }

    // SQL dosyalarını oku ve çalıştır
    const sqlFiles = [
      "lib/database/supabase-functions.sql",
      "lib/database/get-table-structure.sql",
      "lib/database/fix-orders-table.sql",
    ]

    const results = []

    for (const sqlFile of sqlFiles) {
      try {
        const sqlPath = path.join(process.cwd(), sqlFile)
        const sql = fs.readFileSync(sqlPath, "utf8")

        // SQL'i çalıştır
        const { data, error } = await supabase.rpc("exec_sql", { sql })

        results.push({
          file: sqlFile,
          success: !error,
          error: error ? error.message : null,
          data,
        })

        if (error) {
          console.error(`SQL çalıştırma hatası (${sqlFile}):`, error)
        }
      } catch (fileError: any) {
        console.error(`Dosya okuma hatası (${sqlFile}):`, fileError)
        results.push({
          file: sqlFile,
          success: false,
          error: fileError.message,
          data: null,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Veritabanı fonksiyonları başarıyla güncellendi",
      results,
    })
  } catch (error: any) {
    console.error("Veritabanı fonksiyonları güncelleme hatası:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Veritabanı fonksiyonları güncellenirken bir hata oluştu",
      },
      { status: 500 },
    )
  }
}
