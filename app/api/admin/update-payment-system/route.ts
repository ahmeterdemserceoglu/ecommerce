import { NextResponse, NextRequest } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import {
  runPaymentSystemSQL,
  checkPaymentSystemTables,
  checkPaymentSystemPolicies,
  checkTableStructure,
} from "@/lib/database/payment-system-utils"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })

    // Standardized Admin authorization check
    const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession()
    if (sessionError) {
      console.error("[API /api/admin/update-payment-system POST] Error getting session:", sessionError.message)
      return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 })
    }
    if (!session) {
      console.log("[API /api/admin/update-payment-system POST] No session found.")
      return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 })
    }
    const { data: userProfile, error: profileError } = await supabaseAuth
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    if (profileError) {
      console.error(`[API /api/admin/update-payment-system POST] Error fetching profile for user ${session.user.id}:`, profileError.message)
      return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 })
    }
    if (!userProfile || userProfile.role !== 'admin') {
      console.warn(`[API /api/admin/update-payment-system POST] Authorization failed. User role: ${userProfile?.role} (Expected 'admin')`)
      return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 })
    }
    console.log(`[API /api/admin/update-payment-system POST] Admin user ${session.user.id} authorized.`)
    // End standardized admin authorization check

    // Ödeme sistemi SQL'ini çalıştır
    const result = await runPaymentSystemSQL()

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: "Ödeme sistemi güncellenirken bir hata oluştu",
        },
        { status: 500 },
      )
    }

    // Tabloları ve politikaları kontrol et
    const tables = await checkPaymentSystemTables()
    const policies = await checkPaymentSystemPolicies()
    const structure = await checkTableStructure()

    return NextResponse.json({
      success: true,
      message: "Ödeme sistemi başarıyla güncellendi",
      tables,
      policies,
      structure,
    })
  } catch (error: any) {
    console.error("Ödeme sistemi güncelleme hatası:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Ödeme sistemi güncellenirken bir hata oluştu",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })

    // Standardized Admin authorization check
    const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession()
    if (sessionError) {
      console.error("[API /api/admin/update-payment-system GET] Error getting session:", sessionError.message)
      return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 })
    }
    if (!session) {
      console.log("[API /api/admin/update-payment-system GET] No session found.")
      return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 })
    }
    const { data: userProfile, error: profileError } = await supabaseAuth
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    if (profileError) {
      console.error(`[API /api/admin/update-payment-system GET] Error fetching profile for user ${session.user.id}:`, profileError.message)
      return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 })
    }
    if (!userProfile || userProfile.role !== 'admin') {
      console.warn(`[API /api/admin/update-payment-system GET] Authorization failed. User role: ${userProfile?.role} (Expected 'admin')`)
      return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 })
    }
    console.log(`[API /api/admin/update-payment-system GET] Admin user ${session.user.id} authorized.`)
    // End standardized admin authorization check

    // Tabloları ve politikaları kontrol et
    const tables = await checkPaymentSystemTables()
    const policies = await checkPaymentSystemPolicies()
    const structure = await checkTableStructure()

    return NextResponse.json({
      success: true,
      tables,
      policies,
      structure,
    })
  } catch (error: any) {
    console.error("Ödeme sistemi kontrol hatası:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Ödeme sistemi kontrol edilirken bir hata oluştu",
      },
      { status: 500 },
    )
  }
}
