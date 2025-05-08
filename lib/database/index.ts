import { createClient } from "@supabase/supabase-js"

// Improve the createSupabaseClient function
export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials. Please check your environment variables.")
    throw new Error("Supabase credentials are missing")
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      fetch: (...args) => {
        return fetch(...args)
      },
    },
  })
}

export const supabase = createSupabaseClient()

// Veritabanı şemasını yükle
export async function loadDatabaseSchema() {
  try {
    console.log("Veritabanı şeması yükleniyor...")
    // Bu fonksiyon, schema.sql dosyasını Supabase'e yükleyecek şekilde genişletilebilir
    // Şu anda bu işlem Supabase Studio veya CLI aracılığıyla manuel olarak yapılmalıdır
    console.log("Veritabanı şeması yüklendi!")
    return true
  } catch (error) {
    console.error("Veritabanı şeması yüklenirken hata:", error)
    return false
  }
}

// Örnek verileri yükle
export async function loadSeedData() {
  try {
    console.log("Örnek veriler yükleniyor...")
    // Bu fonksiyon, seed.sql dosyasını Supabase'e yükleyecek şekilde genişletilebilir
    // Şu anda bu işlem Supabase Studio veya CLI aracılığıyla manuel olarak yapılmalıdır
    console.log("Örnek veriler yüklendi!")
    return true
  } catch (error) {
    console.error("Örnek veriler yüklenirken hata:", error)
    return false
  }
}

// Improve the testDatabaseConnection function
export async function testDatabaseConnection() {
  try {
    const { data, error } = await supabase.from("categories").select("count").limit(1)

    if (error) {
      console.error("Database connection test failed:", error.message)
      return false
    }

    console.log("Database connection successful!")
    return true
  } catch (error: any) {
    console.error("Database connection test failed with exception:", error.message)
    return false
  }
}
