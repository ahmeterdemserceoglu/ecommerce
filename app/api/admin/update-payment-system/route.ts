import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import {
  runPaymentSystemSQL,
  checkPaymentSystemTables,
  checkPaymentSystemPolicies,
  checkTableStructure,
} from "@/lib/database/payment-system-utils"

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
