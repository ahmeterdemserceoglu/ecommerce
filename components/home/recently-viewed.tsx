"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

interface Product {
  id: string
  name: string
  slug: string
  price: number
  discount_price: number | null
  discount_percentage: number | null
  stock_quantity: number
  rating: number | null
  review_count: number | null
  store_id: string
  product_images: Array<{
    url: string
    alt_text: string
    is_primary: boolean
  }>
  store: {
    id: string
    name: string
    slug: string
  }
}

export function RecentlyViewed() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  const fetchProducts = useCallback(
    async (productIds: string[]) => {
      if (productIds.length === 0) return []

      const { data, error } = await supabase
        .from("products")
        .select(`
        id, name, slug, price, discount_price, discount_percentage,
        stock_quantity, rating, review_count, store_id,
        product_images(url, alt_text, is_primary),
        store:store_id(id, name, slug)
      `)
        .in("id", productIds)
        .eq("is_active", true)
        .eq("is_approved", true)

      if (error) {
        console.error("Error fetching products:", error)
        return []
      }

      return data || []
    },
    [supabase],
  )

  const fetchRecentlyViewed = useCallback(async () => {
    try {
      if (!user) {
        const recentlyViewedIds = JSON.parse(localStorage.getItem("recentlyViewed") || "[]")
        const products = await fetchProducts(recentlyViewedIds)
        setProducts(products)
        return
      }

      // Get recently viewed products from database
      const { data: viewedData, error: viewedError } = await supabase
        .from("recently_viewed")
        .select("product_id")
        .eq("user_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(5)

      if (viewedError) {
        console.error("Error fetching recently viewed:", viewedError)
        // Fallback to local storage
        const recentlyViewedIds = JSON.parse(localStorage.getItem("recentlyViewed") || "[]")
        const products = await fetchProducts(recentlyViewedIds)
        setProducts(products)
        return
      }

      if (!viewedData || viewedData.length === 0) {
        setProducts([])
        return
      }

      const productIds = viewedData.map((item) => item.product_id)
      const products = await fetchProducts(productIds)
      setProducts(products)
    } catch (error) {
      console.error("Error in fetchRecentlyViewed:", error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [user, supabase, fetchProducts])

  const addToRecentlyViewed = useCallback(
    async (productId: string) => {
      try {
        if (!productId) return

        if (user) {
          const { error } = await supabase
            .from("recently_viewed")
            .upsert({ user_id: user.id, product_id: productId }, { onConflict: "user_id,product_id" })

          if (error) {
            console.error("Error adding to recently viewed:", error)
            throw error
          }
        }

        // Always update local storage as fallback
        const recentlyViewedIds = JSON.parse(localStorage.getItem("recentlyViewed") || "[]")
        const filteredIds = recentlyViewedIds.filter((id: string) => id !== productId)
        filteredIds.unshift(productId)
        const limitedIds = filteredIds.slice(0, 5)
        localStorage.setItem("recentlyViewed", JSON.stringify(limitedIds))
      } catch (error) {
        console.error("Error in addToRecentlyViewed:", error)
        toast({
          title: "Hata",
          description: "Son görüntülenen ürünler güncellenirken bir hata oluştu.",
          variant: "destructive",
        })
      }
    },
    [user, supabase, toast],
  )

  useEffect(() => {
    fetchRecentlyViewed()
  }, [fetchRecentlyViewed])

  useEffect(() => {
    if (typeof window !== "undefined") {
      ;(window as any).addToRecentlyViewed = addToRecentlyViewed
    }

    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).addToRecentlyViewed
      }
    }
  }, [addToRecentlyViewed])

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

  if (products.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Henüz görüntülenen ürün bulunmamaktadır.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
      {products.map((product) => {
        const primaryImage = product.product_images?.find((img) => img.is_primary) || product.product_images?.[0]
        const imageUrl = primaryImage?.url || "/placeholder.svg?height=300&width=300"
        const altText = primaryImage?.alt_text || product.name

        return (
          <Link key={product.id} href={`/urun/${product.slug}`}>
            <Card className="border-none overflow-hidden h-full shadow-md hover:shadow-lg transition-all">
              <div className="relative aspect-square">
                <Image
                  src={imageUrl}
                  alt={altText}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                {product.discount_percentage > 0 && (
                  <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-600">
                    %{product.discount_percentage} İndirim
                  </Badge>
                )}
              </div>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-1">{product.store?.name || "Mağaza"}</div>
                <h3 className="font-medium line-clamp-2 mb-2">{product.name}</h3>
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
                        {product.price.toLocaleString("tr-TR")} ₺
                      </span>
                    </>
                  ) : (
                    <span className="font-bold">{product.price.toLocaleString("tr-TR")} ₺</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
