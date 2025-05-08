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

    // SQL dosyasını oku
    const sqlPath = path.join(process.cwd(), "lib/database/fix-orders-table.sql")
    const sql = fs.readFileSync(sqlPath, "utf8")

    // SQL'i çalıştır
    const { data, error } = await supabase.rpc("exec_sql", { sql })

    if (error) {
      console.error("SQL çalıştırma hatası:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          message: "Orders tablosu güncellenirken bir hata oluştu",
        },
        { status: 500 },
      )
    }

    // Orders tablosunun yapısını kontrol et
    const { data: structure, error: structureError } = await supabase.rpc("get_table_structure", {
      table_name: "orders",
    })

    if (structureError) {
      console.error("Tablo yapısı kontrol hatası:", structureError)
    }

    return NextResponse.json({
      success: true,
      message: "Orders tablosu başarıyla güncellendi",
      structure,
      sqlResult: data,
    })
  } catch (error: any) {
    console.error("Orders tablosu güncelleme hatası:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Orders tablosu güncellenirken bir hata oluştu",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
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

    // Orders tablosunun varlığını kontrol et
    const { data: exists, error: existsError } = await supabase.rpc("check_table_exists", {
      table_name: "orders",
    })

    // Orders tablosunun yapısını kontrol et
    let structure = null
    if (exists && exists.exists) {
      const { data: tableStructure, error: structureError } = await supabase.rpc("get_table_structure", {
        table_name: "orders",
      })

      if (!structureError) {
        structure = tableStructure
      }
    }

    return NextResponse.json({
      success: true,
      exists: exists && exists.exists,
      structure,
    })
  } catch (error: any) {
    console.error("Orders tablosu kontrol hatası:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Orders tablosu kontrol edilirken bir hata oluştu",
      },
      { status: 500 },
    )
  }
}
