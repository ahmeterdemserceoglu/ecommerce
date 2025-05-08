"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Zap, ArrowRight } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface Product {
  id: string
  name: string | null
  slug: string | null
  price: number | null
  discount_price: number | null
  discount_percentage: number | null
  image_url: string | null
  stock_quantity: number | null
  sold_count?: number | null
  discount_end_date?: string | null
}

// Export as both named and default export
export function FlashDeals({ products = [] }: { products?: Product[] }) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  // Memoize the end time so the effect doesn't re-run unnecessarily
  const endTime = (() => {
    if (products.length > 0 && products[0]?.discount_end_date) {
      return new Date(products[0].discount_end_date).getTime()
    } else {
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      return end.getTime()
    }
  })()

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      let difference = endTime - now

      if (difference <= 0) {
        // Reset to next day if expired
        const nextDay = new Date()
        nextDay.setDate(nextDay.getDate() + 1)
        nextDay.setHours(23, 59, 59, 999)
        difference = nextDay.getTime() - now
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((difference / 1000 / 60) % 60)
      const seconds = Math.floor((difference / 1000) % 60)

      setTimeLeft({ hours, minutes, seconds })
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [endTime]) // Only depend on endTime

  if (!products || products.length === 0) {
    return null
  }

  return (
    <section className="mb-12 overflow-hidden rounded-xl bg-gradient-to-r from-red-600 to-orange-600 p-6 text-white">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 animate-pulse" />
          <h2 className="text-2xl font-bold">Flaş İndirimler</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-white text-red-600">
              {String(timeLeft.hours).padStart(2, "0")}
            </div>
            <span>:</span>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-white text-red-600">
              {String(timeLeft.minutes).padStart(2, "0")}
            </div>
            <span>:</span>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-white text-red-600">
              {String(timeLeft.seconds).padStart(2, "0")}
            </div>
          </div>

          <Link
            href="/flash-indirimler"
            className="flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-medium text-red-600 transition-transform hover:scale-105"
          >
            Tümünü Gör
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.slice(0, 4).map((product) => (
          <Link
            key={product.id}
            href={product.slug ? `/urunler/${product.slug}` : `/urun/id/${product.id}`}
            className="group rounded-lg bg-white/10 p-4 backdrop-blur-sm transition-all hover:bg-white/20"
          >
            <div className="relative mb-3 aspect-square overflow-hidden rounded-md bg-white/20">
              <Image
                src={product.image_url || "/placeholder.svg?height=200&width=200"}
                alt={product.name || "Ürün"}
                fill
                className="object-contain p-2 transition-transform group-hover:scale-110"
              />

              {product.discount_percentage && (
                <div className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-1 text-xs font-bold">
                  %{product.discount_percentage}
                </div>
              )}
            </div>

            <h3 className="mb-2 line-clamp-2 min-h-[2.5rem] text-sm font-medium">{product.name}</h3>

            <div className="mb-2 flex items-center gap-2">
              {product.discount_price ? (
                <>
                  <span className="text-lg font-bold">
                    {product.discount_price.toLocaleString("tr-TR", {
                      style: "currency",
                      currency: "TRY",
                      minimumFractionDigits: 0,
                    })}
                  </span>
                  <span className="text-sm text-white/70 line-through">
                    {product.price?.toLocaleString("tr-TR", {
                      style: "currency",
                      currency: "TRY",
                      minimumFractionDigits: 0,
                    })}
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold">
                  {product.price?.toLocaleString("tr-TR", {
                    style: "currency",
                    currency: "TRY",
                    minimumFractionDigits: 0,
                  })}
                </span>
              )}
            </div>

            {/* Stock Progress */}
            {product.stock_quantity !== null && product.sold_count !== undefined && (
              <div className="mt-2">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span>Stok durumu</span>
                  <span>
                    {product.stock_quantity} / {product.stock_quantity + product.sold_count}
                  </span>
                </div>
                <Progress
                  value={(product.stock_quantity / (product.stock_quantity + (product.sold_count || 0))) * 100}
                  className="h-1.5"
                />
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}

// Also export as default
export default FlashDeals
