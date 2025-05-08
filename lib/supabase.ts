import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"

// Persistent session configuration
const persistSessionOptions = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
}

export const supabase = createClientComponentClient<Database>({
  ...persistSessionOptions,
})
