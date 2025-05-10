import { NextResponse, NextRequest } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })

    // Standardized Admin authorization check
    const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession()
    if (sessionError) {
      console.error("[API /api/admin/fix-orders-table POST] Error getting session:", sessionError.message)
      return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 })
    }
    if (!session) {
      console.log("[API /api/admin/fix-orders-table POST] No session found.")
      return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 })
    }
    const { data: userProfile, error: profileError } = await supabaseAuth
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    if (profileError) {
      console.error(`[API /api/admin/fix-orders-table POST] Error fetching profile for user ${session.user.id}:`, profileError.message)
      return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 })
    }
    if (!userProfile || userProfile.role !== 'admin') {
      console.warn(`[API /api/admin/fix-orders-table POST] Authorization failed. User role: ${userProfile?.role} (Expected 'admin')`)
      return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 })
    }
    console.log(`[API /api/admin/fix-orders-table POST] Admin user ${session.user.id} authorized.`)
    // End standardized admin authorization check

    // SQL dosyasını oku
    const sqlPath = path.join(process.cwd(), "lib/database/fix-orders-table.sql")
    const sql = fs.readFileSync(sqlPath, "utf8")

    // Initialize Supabase client with SERVICE_ROLE_KEY for exec_sql RPC
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // SQL'i çalıştır
    const { data, error } = await supabaseAdmin.rpc("exec_sql", { sql })

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
    const { data: structure, error: structureError } = await supabaseAuth.rpc("get_table_structure", {
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

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Standardized Admin authorization check
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.error("[API /api/admin/fix-orders-table GET] Error getting session:", sessionError.message)
      return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 })
    }
    if (!session) {
      console.log("[API /api/admin/fix-orders-table GET] No session found.")
      return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 })
    }
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    if (profileError) {
      console.error(`[API /api/admin/fix-orders-table GET] Error fetching profile for user ${session.user.id}:`, profileError.message)
      return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 })
    }
    if (!userProfile || userProfile.role !== 'admin') {
      console.warn(`[API /api/admin/fix-orders-table GET] Authorization failed. User role: ${userProfile?.role} (Expected 'admin')`)
      return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 })
    }
    console.log(`[API /api/admin/fix-orders-table GET] Admin user ${session.user.id} authorized.`)
    // End standardized admin authorization check

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
