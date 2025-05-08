"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Örnek veri - veritabanı sorgusu başarısız olursa kullanılacak
const FALLBACK_PRODUCTS = [
  {
    id: "1",
    name: "Premium Kalite T-Shirt",
    slug: "premium-tshirt",
    price: 249.99,
    discount_price: 199.99,
    image_url: "/placeholder.svg?height=300&width=300",
    rating: 4.5,
    review_count: 128,
    store_id: "store1",
    store_name: "ModaVille",
  },
  {
    id: "2",
    name: "Spor Ayakkabı",
    slug: "spor-ayakkabi",
    price: 899.99,
    discount_price: null,
    image_url: "/placeholder.svg?height=300&width=300",
    rating: 4.8,
    review_count: 256,
    store_id: "store2",
    store_name: "AyakkabiDünyasi",
  },
  {
    id: "3",
    name: "Akıllı Saat",
    slug: "akilli-saat",
    price: 1299.99,
    discount_price: 999.99,
    image_url: "/placeholder.svg?height=300&width=300",
    rating: 4.7,
    review_count: 73,
    store_id: "store3",
    store_name: "TeknoMax",
  },
  {
    id: "4",
    name: "Kablosuz Kulaklık",
    slug: "kablosuz-kulaklik",
    price: 499.99,
    discount_price: 399.99,
    image_url: "/placeholder.svg?height=300&width=300",
    rating: 4.3,
    review_count: 42,
    store_id: "store3",
    store_name: "TeknoMax",
  },
  {
    id: "5",
    name: "Deri Cüzdan",
    slug: "deri-cuzdan",
    price: 349.99,
    discount_price: null,
    image_url: "/placeholder.svg?height=300&width=300",
    rating: 4.6,
    review_count: 89,
    store_id: "store4",
    store_name: "DeriModa",
  },
]

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
}

// Debug bilgisi arayüzü
interface DebugInfo {
  stage?: string
  error?: any
  query?: string
  data?: any
  fallbackUsed?: boolean
  cachedDataUsed?: boolean
  timeElapsed?: number
}

export function TrendingProductsDebug() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchProducts = async () => {
      const startTime = performance.now()
      setLoading(true)
      setError(null)
      setDebugInfo(null)

      try {
        // LocalStorage'dan veri var mı diye kontrol et
        const cachedData = localStorage.getItem("trending_products")
        if (cachedData) {
          try {
            const parsedData = JSON.parse(cachedData)
            if (parsedData && Array.isArray(parsedData) && parsedData.length > 0) {
              setProducts(parsedData)
              setLoading(false)
              setDebugInfo({
                stage: "Cache kullanıldı",
                data: parsedData,
                cachedDataUsed: true,
                timeElapsed: performance.now() - startTime,
              })

              // Arka planda verileri güncellemeye çalış
              fetchFreshData().catch(console.error)
              return
            }
          } catch (e) {
            console.warn("Cache parsing error:", e)
          }
        }

        await fetchFreshData()
      } catch (err: any) {
        console.error("Error in fetchProducts:", err)
        setError(err.message || "Veri yüklenirken bir hata oluştu")
        setProducts(FALLBACK_PRODUCTS)
        setDebugInfo((prev) => ({
          ...prev,
          stage: "Hata - Fallback veri kullanıldı",
          error: err,
          fallbackUsed: true,
          timeElapsed: performance.now() - startTime,
        }))
      } finally {
        setLoading(false)
      }
    }

    const fetchFreshData = async () => {
      try {
        setDebugInfo((prev) => ({
          ...prev,
          stage: "Veritabanı sorgusu yapılıyor",
        }))

        // Basit sorgu - karmaşık join'lerden ve ilişkilerden kaçınarak
        const query = supabase
          .from("products")
          .select("id, name, slug, price, discount_price, image_url, rating, review_count")
          .limit(10)

        setDebugInfo((prev) => ({
          ...prev,
          query: "SELECT id, name, slug, price, discount_price, image_url, rating, review_count FROM products LIMIT 10",
        }))

        const result = await query

        if (result.error) {
          throw result.error
        }

        const finalData = result.data && result.data.length > 0 ? result.data : FALLBACK_PRODUCTS

        setProducts(finalData)
        if (result.data && result.data.length > 0) {
          localStorage.setItem("trending_products", JSON.stringify(finalData))
        }

        setDebugInfo((prev) => ({
          ...prev,
          stage:
            result.data && result.data.length > 0
              ? "Veritabanı verisi başarıyla alındı"
              : "Veritabanı boş - Fallback kullanıldı",
          data: finalData,
          fallbackUsed: !(result.data && result.data.length > 0),
          timeElapsed:
            performance.now() - (prev?.timeElapsed ? prev.timeElapsed + performance.now() : performance.now()),
        }))
      } catch (err: any) {
        console.warn("Error in fetchFreshData:", err)
        setDebugInfo((prev) => ({
          ...prev,
          stage: "Veritabanı sorgusu başarısız oldu",
          error: err,
          fallbackUsed: true,
        }))
        throw err
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

  return (
    <div>
      {/* Debug Panel */}
      {debugInfo && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border text-sm">
          <h3 className="font-bold mb-2">Debug Bilgileri:</h3>
          <div className="grid gap-2">
            <div>
              <span className="font-semibold">Aşama:</span> {debugInfo.stage}
            </div>
            {debugInfo.query && (
              <div>
                <span className="font-semibold">Sorgu:</span>{" "}
                <code className="bg-gray-100 px-1 py-0.5 rounded">{debugInfo.query}</code>
              </div>
            )}
            {debugInfo.error && (
              <div>
                <span className="font-semibold">Hata:</span>{" "}
                <pre className="bg-red-50 p-2 rounded mt-1 overflow-auto">
                  {JSON.stringify(debugInfo.error, null, 2)}
                </pre>
              </div>
            )}
            {debugInfo.timeElapsed && (
              <div>
                <span className="font-semibold">Geçen Süre:</span> {debugInfo.timeElapsed.toFixed(2)}ms
              </div>
            )}
            <div>
              <span className="font-semibold">Önbellek Kullanıldı:</span> {debugInfo.cachedDataUsed ? "Evet" : "Hayır"}
            </div>
            <div>
              <span className="font-semibold">Yedek Veri Kullanıldı:</span> {debugInfo.fallbackUsed ? "Evet" : "Hayır"}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200 text-red-800">
          <h3 className="font-bold mb-2">Hata:</h3>
          <p>{error}</p>
        </div>
      )}

      {/* Products Grid */}
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
                    <Image src={imageUrl || "/placeholder.svg"} alt={altText} fill className="object-cover" />
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
    </div>
  )
}
