import { createClient } from "@supabase/supabase-js"

/**
 * Ödeme sistemi tablolarını ve ilişkilerini kontrol eder
 */
export async function checkPaymentSystemTables() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "")

  // Tabloların varlığını kontrol et
  const tables = [
    "payment_methods",
    "banks",
    "card_tokens",
    "payment_transactions",
    "refunds",
    "payment_integrations",
    "seller_bank_accounts",
    "seller_payout_transactions",
  ]

  const results = {}

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("id").limit(1)
    results[table] = {
      exists: !error,
      error: error ? error.message : null,
    }
  }

  return results
}

/**
 * Ödeme sistemi SQL dosyasını çalıştırır
 */
export async function runPaymentSystemSQL() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "")

  // SQL dosyasını oku
  const fs = require("fs")
  const path = require("path")
  const sqlPath = path.join(process.cwd(), "lib/database/payment-system-fixed.sql")
  const sql = fs.readFileSync(sqlPath, "utf8")

  // SQL'i çalıştır
  const { data, error } = await supabase.rpc("exec_sql", { sql })

  return {
    success: !error,
    data,
    error: error ? error.message : null,
  }
}

/**
 * Ödeme sistemi RLS politikalarını kontrol eder
 */
export async function checkPaymentSystemPolicies() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "")

  // RLS politikalarını kontrol et
  const { data, error } = await supabase.rpc("check_rls_policies", {
    tables: [
      "payment_methods",
      "banks",
      "card_tokens",
      "payment_transactions",
      "refunds",
      "payment_integrations",
      "seller_bank_accounts",
      "seller_payout_transactions",
    ],
  })

  return {
    success: !error,
    policies: data,
    error: error ? error.message : null,
  }
}

/**
 * Ödeme sistemi tablolarının yapısını kontrol eder
 */
export async function checkTableStructure() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "")

  // Tabloların yapısını kontrol et
  const tables = [
    "payment_methods",
    "banks",
    "card_tokens",
    "payment_transactions",
    "refunds",
    "payment_integrations",
    "seller_bank_accounts",
    "seller_payout_transactions",
  ]

  const results = {}

  for (const table of tables) {
    const { data, error } = await supabase.rpc("get_table_structure", { table_name: table })
    results[table] = {
      structure: data,
      error: error ? error.message : null,
    }
  }

  return results
}
