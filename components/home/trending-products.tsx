"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/database.types"
import { ProductCardImage } from "@/components/ProductCardImage"

interface Product {
  id: string
  name: string | null
  slug: string | null
  price: number | null
  discount_price: number | null
  image_url: string | null
  rating: number | null
  review_count: number | null
  store_id: string | null
  store_name?: string | null
  is_approved?: boolean | null
  is_active?: boolean | null
}

// Hata analiz fonksiyonu
function handleSupabaseError(error: any): string {
  if (!error) return "Bilinmeyen bir hata oluştu."
  if (typeof error === "string") return error
  if (error.code === "42501" || error.message?.toLowerCase().includes("permission")) {
    return "Veritabanı erişim izniniz yok. Policy veya RLS ayarlarını kontrol edin."
  }
  if (error.code === "42P01" || error.message?.toLowerCase().includes("does not exist")) {
    return "Tablo veya sütun eksik. İlgili tablo/sütun veritabanında mevcut mu?"
  }
  if (error.code === "42501") {
    return "Yetki hatası: Policy veya RLS (Row Level Security) eksik veya yanlış."
  }
  if (error.code === "PGRST116") {
    return "Policy hatası: İlgili tabloya erişim için bir policy tanımlı değil."
  }
  if (error.code === "28P01" || error.message?.toLowerCase().includes("authentication")) {
    return "Veritabanı bağlantı veya kimlik doğrulama hatası. Anahtarlar ve bağlantı bilgilerini kontrol edin."
  }
  if (error.code === "42522" || error.message?.toLowerCase().includes("column")) {
    return "Sütun hatası: Sorgulanan sütun veritabanında mevcut değil."
  }
  if (error.code === "PGRST301" || error.message?.toLowerCase().includes("row level security")) {
    return "RLS (Row Level Security) aktif ancak uygun policy yok. Policy ekleyin."
  }
  if (error.code === "PGRST108" || error.message?.toLowerCase().includes("jwt")) {
    return "JWT veya kimlik doğrulama hatası. Kullanıcı oturumunu kontrol edin."
  }
  if (error.message?.toLowerCase().includes("timeout")) {
    return "Veritabanı isteği zaman aşımına uğradı. Bağlantı veya ağ sorunlarını kontrol edin."
  }
  // Diğer hata türleri
  return error.message || JSON.stringify(error)
}

export function TrendingProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        setError(null)

        // LocalStorage'dan veri var mı diye kontrol et
        const cachedData = localStorage.getItem("trending_products")
        if (cachedData) {
          const parsedData = JSON.parse(cachedData)
          if (parsedData && Array.isArray(parsedData) && parsedData.length > 0) {
            setProducts(parsedData)
            setLoading(false)

            // Arka planda verileri güncellemeye çalış, ama hata olursa sessizce devam et
            fetchDataInBackground().catch(console.error)
            return
          }
        }

        // Eğer cache yoksa normal fetch işlemi yap
        await fetchDataDirectly()
      } catch (error: any) {
        const detailedError = handleSupabaseError(error)
        console.error("Error fetching trending products:", error)
        setError(detailedError)
        // Hata durumunda fallback verileri göster
        setProducts(FALLBACK_PRODUCTS)
      } finally {
        setLoading(false)
      }
    }

    // Doğrudan ürün verilerini getir - yakalanabilir hatalarla
    const fetchDataDirectly = async () => {
      try {
        // Timeout promise to prevent hanging
        const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out")), 5000),
        )

        // Basit bir sorgu oluştur
        const queryPromise = supabase
          .from("products")
          .select("id, name, slug, price, discount_price, image_url, rating, review_count, store_id")
          .eq("is_approved", true)
          .eq("is_active", true)
          .limit(10)

        // Race the promises
        const result = await Promise.race([queryPromise, timeoutPromise])

        if (result.error) {
          throw result.error
        }

        if (result.data && result.data.length > 0) {
          localStorage.setItem("trending_products", JSON.stringify(result.data))
        }
      } catch (error: any) {
        const detailedError = handleSupabaseError(error)
        setError(detailedError)
        throw error // Üst seviyeye hata fırlat
      }
    }

    // Arkaplanda sessizce veri güncelleme - hatalar sessizce yönetilir
    const fetchDataInBackground = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, slug, price, discount_price, image_url, rating, review_count, store_id")
          .eq("is_approved", true)
          .eq("is_active", true)
          .limit(10)

        if (error) {
          console.warn("Background fetch error:", handleSupabaseError(error))
          return
        }

        if (data && data.length > 0) {
          localStorage.setItem("trending_products", JSON.stringify(data))
          setProducts(data)
        }
      } catch (err) {
        console.warn("Background fetch failed:", handleSupabaseError(err))
      }
    }

    fetchProducts()
  }, [supabase])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="border-none shadow-md overflow-hidden">
            <div className="aspect-square bg-gray-100 animate-pulse" />
            <CardContent className="p-4">
              <div className="h-4 bg-gray-100 rounded animate-pulse mb-2" />
              <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
              <div className="mt-4 h-6 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error && products.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Ürünler yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.</p>
        <pre className="text-xs text-red-500 mt-2 whitespace-pre-wrap">{error}</pre>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
      {products.map((product) => {
        const imageUrl = product.image_url || "/placeholder.svg?height=300&width=300"
        const altText = product.name || "Ürün"

        return (
          <div key={product.id} className="relative h-full flex flex-col">
            <Link
              href={product.slug ? `/urun/${product.slug}` : `/urun/id/${product.id}`}
              className="flex-1 flex flex-col"
            >
              <Card className="border-none overflow-hidden h-full shadow-md hover:shadow-xl transition-all duration-300 group relative">
                <div className="relative aspect-square">
                  <ProductCardImage product={product} className="object-cover w-full h-full" />
                </div>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">{product.store_name || "Mağaza"}</div>
                  <h3 className="font-medium leading-tight mb-1 line-clamp-2">{product.name}</h3>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{product.rating?.toFixed(1) || "0.0"}</span>
                    <span className="text-xs text-muted-foreground">({product.review_count || 0})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {product.discount_price ? (
                      <>
                        <span className="font-bold">{product.discount_price.toLocaleString("tr-TR")} ₺</span>
                        <span className="text-sm text-muted-foreground line-through">
                          {product.price?.toLocaleString("tr-TR")} ₺
                        </span>
                      </>
                    ) : (
                      <span className="font-bold">{product.price?.toLocaleString("tr-TR")} ₺</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )
      })}
    </div>
  )
}
