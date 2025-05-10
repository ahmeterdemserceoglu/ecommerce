import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })

  // Admin authorization check
  const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession()
  if (sessionError) {
    console.error("[API /api/admin/payouts GET] Error getting session:", sessionError.message)
    return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 })
  }
  if (!session) {
    console.log("[API /api/admin/payouts GET] No session found.")
    return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 })
  }
  const { data: profile, error: profileError } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (profileError) {
    console.error(`[API /api/admin/payouts GET] Error fetching profile for user ${session.user.id}:`, profileError.message)
    return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 })
  }
  if (!profile || profile.role !== 'admin') {
    console.warn(`[API /api/admin/payouts GET] Authorization failed. User role: ${profile?.role} (Expected 'admin')`)
    return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 })
  }
  console.log(`[API /api/admin/payouts GET] Admin user ${session.user.id} authorized.`)
  // End admin authorization check

  const supabaseAdmin = createAdminClient()
  const { data, error } = await supabaseAdmin
    .from("seller_payout_transactions")
    .select(`
      id, amount, status, description, created_at,
      store_id, 
      requested_by, 
      bank_account_id 
    `)
    .order("created_at", { ascending: false })

  if (error) {
    // Log the detailed error from Supabase if it occurs here
    console.error("[API /api/admin/payouts GET] Supabase query error:", error);
    return NextResponse.json({ payouts: [], error: error.message, details: error }, { status: 500 })
  }

  const payouts = (data || []).map((p: any) => ({
    id: p.id,
    amount: p.amount,
    status: p.status,
    description: p.description,
    created_at: p.created_at,
    // We are only fetching IDs now, so display them or a placeholder
    seller_name: p.requested_by || "(ID: " + p.requested_by + ")" || "-",
    store_name: p.store_id || "(ID: " + p.store_id + ")" || "-",
    bank_name: p.bank_account_id ? "(Bank ID: " + p.bank_account_id + ")" : "-",
    iban: "-", // IBAN requires joining bank details
  }))

  return NextResponse.json({ payouts })
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies()
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })

  // Admin authorization check
  const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession()
  if (sessionError) {
    console.error("[API /api/admin/payouts POST] Error getting session:", sessionError.message)
    return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 })
  }
  if (!session) {
    console.log("[API /api/admin/payouts POST] No session found.")
    return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 })
  }
  const { data: profile, error: profileError } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (profileError) {
    console.error(`[API /api/admin/payouts POST] Error fetching profile for user ${session.user.id}:`, profileError.message)
    return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 })
  }
  if (!profile || profile.role !== 'admin') {
    console.warn(`[API /api/admin/payouts POST] Authorization failed. User role: ${profile?.role} (Expected 'admin')`)
    return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 })
  }
  console.log(`[API /api/admin/payouts POST] Admin user ${session.user.id} authorized.`)
  // End admin authorization check

  const supabaseAdmin = createAdminClient()
  const { id } = await request.json()
  // payout'u COMPLETED yap
  const { error } = await supabaseAdmin
    .from("seller_payout_transactions")
    .update({ status: "COMPLETED" })
    .eq("id", id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
} 