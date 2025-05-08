import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: Request, context: { params: { id: string } }) {
  const { params } = context
  const awaitedParams = await params
  const cardId = awaitedParams.id
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  console.log("DEBUG: API user id:", user?.id, "userError:", userError)
  if (!cardId) {
    return NextResponse.json({ error: "Eksik kart ID" }, { status: 400 })
  }
  const { data, error } = await supabase
    .from("card_tokens")
    .select("*")
    .eq("id", cardId)
    .single()
  console.log("DEBUG: Supabase error:", error)
  console.log("DEBUG: Card user_id:", data?.user_id)
  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Kart bulunamadı" }, { status: 404 })
  }
  if (user?.id !== data.user_id) {
    console.log("DEBUG: user_id eşleşmiyor! API user id:", user?.id, "Card user_id:", data.user_id)
    return NextResponse.json({ error: "Kullanıcı yetkisi yok veya user_id eşleşmiyor" }, { status: 403 })
  }
  return NextResponse.json({ card: data })
} 