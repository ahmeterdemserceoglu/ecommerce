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
      console.error("[API /api/admin/update-database-functions POST] Error getting session:", sessionError.message)
      return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 })
    }
    if (!session) {
      console.log("[API /api/admin/update-database-functions POST] No session found.")
      return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 })
    }
    const { data: userProfile, error: profileError } = await supabaseAuth
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    if (profileError) {
      console.error(`[API /api/admin/update-database-functions POST] Error fetching profile for user ${session.user.id}:`, profileError.message)
      return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 })
    }
    if (!userProfile || userProfile.role !== 'admin') {
      console.warn(`[API /api/admin/update-database-functions POST] Authorization failed. User role: ${userProfile?.role} (Expected 'admin')`)
      return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 })
    }
    console.log(`[API /api/admin/update-database-functions POST] Admin user ${session.user.id} authorized.`)
    // End standardized admin authorization check

    // Initialize Supabase client with SERVICE_ROLE_KEY for exec_sql RPC
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

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

        // SQL'i çalıştır (use supabaseAdmin)
        const { data, error } = await supabaseAdmin.rpc("exec_sql", { sql })

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
