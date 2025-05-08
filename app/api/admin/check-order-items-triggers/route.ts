import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  try {
    // Trigger'ları kontrol et
    const { data: triggers, error: triggerError } = await supabase.rpc("get_table_triggers", {
      table_name: "order_items",
    })

    if (triggerError) {
      return NextResponse.json(
        {
          success: false,
          error: triggerError.message,
          message: "Trigger'lar kontrol edilirken hata oluştu",
        },
        { status: 500 },
      )
    }

    // Tablo yapısını kontrol et
    const { data: tableInfo, error: tableError } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type, is_nullable")
      .eq("table_name", "order_items")

    if (tableError) {
      return NextResponse.json(
        {
          success: false,
          error: tableError.message,
          message: "Tablo yapısı kontrol edilirken hata oluştu",
        },
        { status: 500 },
      )
    }

    // Fonksiyonları kontrol et
    const { data: functions, error: functionError } = await supabase
      .from("information_schema.routines")
      .select("routine_name, routine_definition")
      .eq("routine_type", "FUNCTION")
      .ilike("routine_definition", "%order_items%")

    if (functionError) {
      return NextResponse.json(
        {
          success: false,
          error: functionError.message,
          message: "Fonksiyonlar kontrol edilirken hata oluştu",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      triggers,
      tableInfo,
      functions,
      message: "Veritabanı kontrolleri tamamlandı",
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Beklenmeyen bir hata oluştu",
      },
      { status: 500 },
    )
  }
}
