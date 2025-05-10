import { type NextRequest, NextResponse } from "next/server"
import { PayoutService } from "@/lib/seller/payout-service"
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"
import { z } from "zod"

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 401 })
    }

    const payoutService = new PayoutService()

    // Ödeme özetini al
    const summary = await payoutService.getSellerPaymentSummary(user.id)

    // Ödeme geçmişini al
    const history = await payoutService.getSellerPayoutHistory(user.id)

    return NextResponse.json({
      success: true,
      summary,
      history,
    })
  } catch (error: any) {
    console.error("Payouts error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Ödeme bilgileri alınırken bir hata oluştu",
      },
      { status: 500 },
    )
  }
}

// Define the expected request body structure using Zod for validation
const PayoutRequestSchema = z.object({
  amount: z.number().positive({ message: "Tutar pozitif bir değer olmalıdır." }),
  currency: z.string().min(3, { message: "Para birimi en az 3 karakter olmalıdır." }).default("TRY"),
  seller_bank_account_id: z.string().uuid({ message: "Geçerli bir banka hesap ID\'si girilmelidir." }),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ success: false, message: "Kullanıcı bulunamadı veya yetkisiz erişim." }, { status: 401 })
    }

    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    )

    // Get seller ID
    const { data: seller, error: sellerError } = await supabaseAdmin
      .from("sellers")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (sellerError || !seller) {
      return NextResponse.json({ success: false, message: "Satıcı bilgileri bulunamadı." }, { status: 404 })
    }
    const sellerId = seller.id

    // Validate request body
    const body = await request.json()
    const validationResult = PayoutRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Geçersiz istek verisi.",
          errors: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { amount: requestedAmount, currency, seller_bank_account_id } = validationResult.data

    // 1. Get current balance
    let currentBalance = 0
    const { data: lastLedgerEntry, error: lastLedgerError } = await supabaseAdmin
      .from("seller_ledgers")
      .select("balance_after_transaction")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (lastLedgerError && lastLedgerError.code !== 'PGRST116') { // PGRST116: no rows found
      console.error("Error fetching last seller ledger entry for balance check:", lastLedgerError)
      return NextResponse.json({ success: false, message: "Bakiye kontrol edilirken bir hata oluştu." }, { status: 500 })
    }
    if (lastLedgerEntry) {
      currentBalance = lastLedgerEntry.balance_after_transaction || 0
    }

    // 2. Validate Amount vs. Balance
    if (requestedAmount > currentBalance) {
      return NextResponse.json(
        { success: false, message: `İstenen tutar (${requestedAmount} ${currency}) mevcut bakiyenizi (${currentBalance} ${currency}) aşıyor.` },
        { status: 400 }
      )
    }

    // 3. Validate Bank Account
    const { data: bankAccount, error: bankAccountError } = await supabaseAdmin
      .from("seller_bank_accounts")
      .select("id, currency") // Add is_verified later if needed
      .eq("id", seller_bank_account_id)
      .eq("seller_id", sellerId)
      .single()

    if (bankAccountError || !bankAccount) {
      console.error("Bank account validation error:", bankAccountError)
      return NextResponse.json({ success: false, message: "Seçilen banka hesabı bulunamadı veya size ait değil." }, { status: 404 })
    }
    // Optional: Check if bankAccount.currency matches requested currency, though usually payout is in account's currency.

    // --- Start Database Operations ---
    // Ideally, these should be in a transaction. Using sequential for now.

    // 4. Create Payout Request
    const { data: newPayoutRequest, error: payoutRequestError } = await supabaseAdmin
      .from("seller_payout_requests")
      .insert({
        seller_id: sellerId,
        seller_bank_account_id: seller_bank_account_id,
        requested_amount: requestedAmount,
        currency: currency, // Or bankAccount.currency
        status: "PENDING_APPROVAL",
        requested_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (payoutRequestError || !newPayoutRequest) {
      console.error("Error creating seller payout request:", payoutRequestError)
      return NextResponse.json({ success: false, message: "Ödeme talebi oluşturulurken bir hata oluştu." }, { status: 500 })
    }

    // 5. Create Ledger Entry for Payout Request Debit
    const newBalanceAfterPayout = currentBalance - requestedAmount
    const { error: ledgerError } = await supabaseAdmin
      .from("seller_ledgers")
      .insert({
        seller_id: sellerId,
        payout_request_id: newPayoutRequest.id,
        transaction_type: "PAYOUT_REQUEST_DEBIT",
        amount: -requestedAmount, // Negative value for debit
        currency: currency,
        description: `Ödeme talebi: ${newPayoutRequest.id}`,
        balance_after_transaction: newBalanceAfterPayout,
        reference_details: { bank_account_id: seller_bank_account_id },
      })

    if (ledgerError) {
      console.error("Error creating seller ledger entry for payout debit:", ledgerError)
      // Attempt to roll back or mark payout request as failed if critical
      // For now, log and return error. The payout request might be orphaned.
      return NextResponse.json({ success: false, message: "Ödeme talebi için bakiye güncellenirken bir hata oluştu." }, { status: 500 })
    }

    // --- End Database Operations ---

    return NextResponse.json({
      success: true,
      message: "Ödeme talebiniz başarıyla alındı. Admin onayından sonra işleme alınacaktır.",
      payoutRequestId: newPayoutRequest.id,
      newBalance: newBalanceAfterPayout
    })

  } catch (error: any) {
    console.error("POST /api/seller/payouts - Unhandled error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Ödeme talebi işlenirken beklenmedik bir hata oluştu.",
      },
      { status: 500 }
    )
  }
}
