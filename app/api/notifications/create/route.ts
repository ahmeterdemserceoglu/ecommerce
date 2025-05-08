import { NextResponse } from "next/server"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const supabase = createServerComponentClient({ cookies })
    const body = await request.json()

    // Gerekli alanları kontrol et
    const { userId, title, message, type, referenceId, referenceType } = body

    if (!userId || !title || !message || !type) {
      return NextResponse.json({ error: "userId, title, message ve type alanları zorunludur" }, { status: 400 })
    }

    // Admin veya sistem yetkisi kontrolü
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Kullanıcının admin olup olmadığını kontrol et
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin" && profile?.role !== "system") {
      return NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 })
    }

    // Bildirim oluştur
    const { data, error } = await supabase.rpc("create_notification", {
      p_user_id: userId,
      p_title: title,
      p_message: message,
      p_type: type,
      p_reference_id: referenceId || null,
      p_reference_type: referenceType || null,
    })

    if (error) {
      console.error("Bildirim oluşturma hatası:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, notificationId: data })
  } catch (error: any) {
    console.error("Bildirim oluşturma hatası:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
