"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, Store, CheckCircle } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useAuth } from "@/hooks/use-auth"

interface StoreType {
  id: string
  name: string
  slug: string
  logo_url: string | null
  rating: number | null
  review_count: number | null
  is_verified: boolean | null
  is_featured: boolean | null
  productCount?: number
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

export function PopularStores() {
  const [stores, setStores] = useState<StoreType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      setStores([])
      setLoading(false)
      localStorage.removeItem("popular_stores")
      return
    }
    const fetchStores = async () => {
      try {
        setLoading(true)
        setError(null)

        // Try to fetch limit from settings with a timeout
        const settingsPromise = supabase.from("settings").select("featured_store_limit").single()

        const settingsTimeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error("Settings fetch timed out")), 10000),
        )

        const settingsResult = await Promise.race([settingsPromise, settingsTimeoutPromise])

        const limit = settingsResult.data?.featured_store_limit || 8

        // Fetch popular stores with a timeout
        const storePromise = supabase
          .from("stores")
          .select(`
            id, name, slug, logo_url, rating, review_count, 
            is_verified, is_featured
          `)
          .eq("is_active", true)
          .order("is_featured", { ascending: false })
          .order("rating", { ascending: false })
          .limit(limit)

        const storeTimeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error("Store fetch timed out")), 10000),
        )

        const storeResult = await Promise.race([storePromise, storeTimeoutPromise])

        if (storeResult.error) throw storeResult.error

        // Get product count for each store with error handling
        const storesWithProductCount = await Promise.all(
          (storeResult.data || []).map(async (store: StoreType) => {
            try {
              const countPromise = supabase
                .from("products")
                .select("id", { count: "exact", head: true })
                .eq("store_id", store.id)
                .eq("is_active", true)
                .eq("is_approved", true)

              const countTimeoutPromise = new Promise<{ count: number; error: Error }>((_, reject) =>
                setTimeout(() => reject(new Error("Count fetch timed out")), 10000),
              )

              const { count, error: countError } = await Promise.race([countPromise, countTimeoutPromise])

              return {
                ...store,
                productCount: countError ? 0 : count || 0,
              }
            } catch (err) {
              console.error(`Error fetching product count for store ${store.id}:`, err)
              return {
                ...store,
                productCount: 0,
              }
            }
          }),
        )

        setStores(storesWithProductCount)

        // Cache the results
        try {
          localStorage.setItem("popular_stores", JSON.stringify(storesWithProductCount))
        } catch (e) {
          // Ignore storage errors
        }
      } catch (error: any) {
        const detailedError = handleSupabaseError(error)
        console.error("Error fetching popular stores:", error)
        setError(detailedError)

        // Try to load from cache
        try {
          const cachedData = localStorage.getItem("popular_stores")
          if (cachedData) {
            setStores(JSON.parse(cachedData))
          } else {
            setStores([])
          }
        } catch (e) {
          setStores([])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchStores()
  }, [supabase, user])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-none shadow-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-gray-100 animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 bg-gray-100 rounded animate-pulse w-32" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Mağazalar yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.
        </p>
        <pre className="text-xs text-red-500 mt-2 whitespace-pre-wrap">{error}</pre>
      </div>
    )
  }

  if (stores.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Şu anda popüler mağaza bulunmamaktadır.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {stores.map((store) => (
        <Link key={store.id} href={`/magaza/${store.slug}`}>
          <Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border-2 border-orange-100 dark:border-orange-900">
                  {store.logo_url ? (
                    <Image src={store.logo_url || "/placeholder.svg"} alt={store.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      <Store className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-lg truncate">{store.name}</h3>
                    {store.is_verified && <CheckCircle className="h-4 w-4 text-blue-500 fill-blue-100" />}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{store.rating?.toFixed(1) || "0.0"}</span>
                    <span className="text-xs text-muted-foreground">({store.review_count || 0})</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{store.productCount} ürün</div>
                {store.is_featured && (
                  <Badge variant="outline" className="border-orange-500 text-orange-500">
                    Öne Çıkan
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
