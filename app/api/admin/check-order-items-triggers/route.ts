import { NextResponse, NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })

  // Admin authorization check
  const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession()
  if (sessionError) {
    console.error("[API /api/admin/check-order-items-triggers GET] Error getting session:", sessionError.message)
    return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 })
  }
  if (!session) {
    console.log("[API /api/admin/check-order-items-triggers GET] No session found.")
    return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 })
  }
  const { data: profile, error: profileError } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (profileError) {
    console.error(`[API /api/admin/check-order-items-triggers GET] Error fetching profile for user ${session.user.id}:`, profileError.message)
    return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 })
  }
  if (!profile || profile.role !== 'admin') {
    console.warn(`[API /api/admin/check-order-items-triggers GET] Authorization failed. User role: ${profile?.role} (Expected 'admin')`)
    return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 })
  }
  console.log(`[API /api/admin/check-order-items-triggers GET] Admin user ${session.user.id} authorized.`)
  // End admin authorization check

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Trigger'ları kontrol et
    const { data: triggers, error: triggerError } = await supabaseAdmin.rpc("get_table_triggers", {
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
    const { data: tableInfo, error: tableError } = await supabaseAdmin
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
    const { data: functions, error: functionError } = await supabaseAdmin
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
