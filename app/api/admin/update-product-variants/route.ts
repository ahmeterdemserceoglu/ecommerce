import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST() {
  try {
    // SQL dosyasını oku
    const response = await fetch("/lib/database/product-variants.sql")
    const sql = await response.text()

    // SQL komutlarını çalıştır
    const { error } = await supabase.rpc("run_sql", { sql_query: sql })

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
