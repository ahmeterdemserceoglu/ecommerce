import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"

// Admin istemcisini oluştur (servis rolü ile)
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Supabase ortam değişkenleri eksik: NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY")
    return null
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Admin istemcisini dışa aktar
const supabaseAdmin = createAdminClient()
export default supabaseAdmin
