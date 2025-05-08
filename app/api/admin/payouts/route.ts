import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

export async function GET() {
  const supabase = createAdminClient()
  // Tüm payout taleplerini, satıcı ve banka bilgileriyle birlikte getir
  const { data, error } = await supabase
    .from("seller_payout_transactions")
    .select(`
      id, amount, status, description, created_at,
      seller: seller_id (id, full_name, email),
      bank: bank_account_id (id, bank_name, iban)
    `)
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ payouts: [], error: error.message }, { status: 500 })
  // Düzgün veri formatı
  const payouts = (data || []).map((p: any) => ({
    id: p.id,
    amount: p.amount,
    status: p.status,
    description: p.description,
    created_at: p.created_at,
    seller_name: p.seller?.full_name || p.seller?.email || "-",
    bank_name: p.bank?.bank_name || "-",
    iban: p.bank?.iban || "-",
  }))
  return NextResponse.json({ payouts })
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const { id } = await request.json()
  // payout'u COMPLETED yap
  const { error } = await supabase
    .from("seller_payout_transactions")
    .update({ status: "COMPLETED" })
    .eq("id", id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
} 