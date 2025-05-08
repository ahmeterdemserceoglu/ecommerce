"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Clock, ShoppingCart, Heart, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Product {
  id: string
  name: string | null
  slug: string | null
  price: number | null
  discount_price: number | null
  discount_percentage: number | null
  image_url: string | null
  rating: number | null
  review_count: number | null
  stock_quantity: number | null
  store_id: string | null
  store_name?: string | null
  is_daily_deal?: boolean | null
  discount_end_date?: string | null
  store_slug?: string | null
}

function DailyDeals({ products = [] }: { products?: Product[] }) {
  return (
    <section className="mb-12">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Günün Fırsatları</h2>
          <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
            <Clock className="mr-1 h-3 w-3" /> Sınırlı Süre
          </Badge>
        </div>
        <Link href="/firsatlar" className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline">
          Tümünü Gör
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {products.map((product) => (
          <DealCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}

function DealCard({ product }: { product: Product }) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number
    minutes: number
    seconds: number
  } | null>(null)

  // Calculate discount end time - if not set, default to end of day
  useEffect(() => {
    if (!product.discount_end_date) return

    const calculateTimeLeft = () => {
      const endTime = new Date(product.discount_end_date || "").getTime()
      const now = new Date().getTime()
      const difference = endTime - now

      if (difference <= 0) {
        setTimeLeft(null)
        return
      }

      setTimeLeft({
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      })
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [product.discount_end_date])

  const discountPercentage =
    product.discount_percentage ||
    (product.price && product.discount_price
      ? Math.round(((product.price - product.discount_price) / product.price) * 100)
      : null)

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-md">
      <div className="relative pt-[100%]">
        {/* Discount Badge */}
        {discountPercentage && (
          <div className="absolute left-2 top-2 z-10 rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white">
            %{discountPercentage}
          </div>
        )}

        {/* Quick Action Buttons */}
        <div className="absolute right-2 top-2 z-10 flex flex-col gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white"
            title="Favorilere Ekle"
          >
            <Heart className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white"
            title="Hızlı Bakış"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>

        {/* Product Image */}
        <Link href={product.slug ? `/urun/${product.slug}` : `/urun/id/${product.id}`} className="absolute inset-0">
          <Image
            src={product.image_url || "/placeholder.svg?height=300&width=300"}
            alt={product.name || "Ürün"}
            fill
            className="object-contain p-4 transition-transform group-hover:scale-105"
          />
        </Link>

        {/* Stock Status */}
        {product.stock_quantity !== null && product.stock_quantity <= 5 && (
          <div className="absolute bottom-0 left-0 right-0 bg-amber-100 py-1 text-center text-xs font-medium text-amber-800">
            {product.stock_quantity === 0 ? "Tükendi" : `Son ${product.stock_quantity} ürün!`}
          </div>
        )}
      </div>

      <CardContent className="p-3">
        {/* Store Name */}
        {product.store_name && (
          <Link
            href={product.store_slug ? `/magazalar/${product.store_slug}` : `/magazalar/${product.store_id}`}
            className="mb-1 block text-xs text-gray-500 hover:text-gray-700 hover:underline"
          >
            {product.store_name}
          </Link>
        )}

        {/* Product Name */}
        <Link href={product.slug ? `/urun/${product.slug}` : `/urun/id/${product.id}`} className="block">
          <h3 className="mb-2 line-clamp-2 min-h-[2.5rem] text-sm font-medium text-gray-900 hover:text-orange-600">
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <div className="mb-2 flex items-center gap-2">
          {product.discount_price ? (
            <>
              <span className="text-lg font-bold text-orange-600">
                {product.discount_price.toLocaleString("tr-TR", {
                  style: "currency",
                  currency: "TRY",
                  minimumFractionDigits: 0,
                })}
              </span>
              <span className="text-sm text-gray-500 line-through">
                {product.price?.toLocaleString("tr-TR", {
                  style: "currency",
                  currency: "TRY",
                  minimumFractionDigits: 0,
                })}
              </span>
            </>
          ) : (
            <span className="text-lg font-bold text-gray-900">
              {product.price?.toLocaleString("tr-TR", {
                style: "currency",
                currency: "TRY",
                minimumFractionDigits: 0,
              })}
            </span>
          )}
        </div>

        {/* Countdown Timer */}
        {timeLeft && (
          <div className="mb-3 flex items-center justify-center gap-1 rounded-md bg-gray-100 p-1 text-xs font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-800 text-white">
              {String(timeLeft.hours).padStart(2, "0")}
            </div>
            <span>:</span>
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-800 text-white">
              {String(timeLeft.minutes).padStart(2, "0")}
            </div>
            <span>:</span>
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-800 text-white">
              {String(timeLeft.seconds).padStart(2, "0")}
            </div>
          </div>
        )}

        {/* Add to Cart Button */}
        <Button className="w-full gap-2 bg-orange-600 hover:bg-orange-700">
          <ShoppingCart className="h-4 w-4" />
          Sepete Ekle
        </Button>
      </CardContent>
    </Card>
  )
}

// Export both as named export and default export
export { DailyDeals }
export default DailyDeals
