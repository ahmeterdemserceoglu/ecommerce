import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function getSignedImageUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("images").createSignedUrl(path, 60 * 60 * 24 * 365 * 100) // 100 yıl
  if (error) {
    console.error("Signed URL alınırken hata:", error)
    return null
  }
  return data?.signedUrl || null
}

// Her türlü url'yi normalize edip signed url döndürür
export async function getSignedImageUrlForAny(urlOrPath: string, expiresInSec = 3600): Promise<string | null> {
  let path = urlOrPath

  // Eğer tam URL geldiyse, sadece dosya yolunu ayıkla
  if (path.startsWith("http")) {
    // Hem public/images/ hem de public/ varyantlarını yakala
    path = path.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/(images\/)?/, "")
  }
  // Eğer başında images/ varsa, kırp
  if (path.startsWith("images/")) {
    path = path.replace(/^images\//, "")
  }

  try {
    const { data, error } = await supabase.storage.from("images").createSignedUrl(path, expiresInSec)
    if (error) {
      console.error("Signed URL alınırken hata:", error)
      return null
    }
    return data?.signedUrl || null
  } catch (e) {
    console.error("Signed URL alınırken hata:", e)
    return null
  }
}
