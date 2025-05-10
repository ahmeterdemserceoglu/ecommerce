"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Zap, ArrowRight, Clock } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { CountdownTimer } from "@/components/ui/countdown-timer"
import { cn } from "@/lib/utils"
import { getSignedImageUrlForAny } from "@/lib/get-signed-url"

interface Product {
  id: string
  name: string | null
  slug: string | null
  price: number | null
  discount_price: number | null
  discount_percentage?: number | null
  image_url: string | null
  stock_quantity: number | null
  sold_count?: number | null
  discount_end_date?: string | null
  max_flash_quantity?: number | null
}

export function FlashDeals({ products = [] }: { products?: Product[] }) {
  const [overallEndTime, setOverallEndTime] = useState<string | null>(null)
  const [signedImageUrls, setSignedImageUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    // Get signed URLs for all product images
    async function signImages() {
      const urlPromises = products.map(async (product) => {
        if (product.image_url) {
          try {
            const signedUrl = await getSignedImageUrlForAny(product.image_url);
            return { id: product.id, url: signedUrl || "/placeholder.svg" };
          } catch (error) {
            console.error(`Error signing URL for product ${product.id}:`, error);
            return { id: product.id, url: "/placeholder.svg" };
          }
        }
        return { id: product.id, url: "/placeholder.svg" };
      });

      const results = await Promise.all(urlPromises);
      const urlMap = results.reduce((acc, { id, url }) => {
        acc[id] = url;
        return acc;
      }, {} as Record<string, string>);

      setSignedImageUrls(urlMap);
    }

    if (products.length > 0) {
      signImages();

      const earliestEndTime = products.reduce((earliest, current) => {
        if (!current.discount_end_date) return earliest
        const currentTime = new Date(current.discount_end_date).getTime()
        if (!earliest || currentTime < new Date(earliest).getTime()) {
          return current.discount_end_date
        }
        return earliest
      }, null as string | null)
      setOverallEndTime(earliestEndTime)
    } else {
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      setOverallEndTime(end.toISOString())
    }
  }, [products])

  if (!products || products.length === 0) {
    return (
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="h-7 w-7 text-primary" />
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Flaş İndirimler</h2>
        </div>
        <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">Şu anda aktif flaş indirim bulunmamaktadır.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="mb-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Zap className="h-7 w-7 text-red-500" />
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Flaş İndirimler</h2>
        </div>
        {overallEndTime && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Bitmesine Kalan Süre:</span>
            <CountdownTimer
              endTime={overallEndTime}
              className="flex items-center gap-1 text-sm font-mono"
              timeBoxClassName="bg-red-500 text-white px-2 py-1 rounded text-center min-w-[24px]"
              separatorClassName="text-red-500 font-semibold"
            />
          </div>
        )}
      </div>

      <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {products.map((product) => {
          const originalPrice = product.price
          const salePrice = product.discount_price
          let discountPercentage = 0
          if (originalPrice && salePrice && originalPrice > salePrice) {
            discountPercentage = Math.round(((originalPrice - salePrice) / originalPrice) * 100)
          }

          // Get the signed image URL for this product
          const productImageUrl = signedImageUrls[product.id] || "/placeholder.svg";

          return (
            <Link
              key={product.id}
              href={product.slug ? `/urun/${product.slug}` : `/urun/id/${product.id}`}
              className="group relative flex-shrink-0 w-60 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-gray-100 dark:bg-gray-700">
                <Image
                  src={productImageUrl}
                  alt={product.name || "Ürün"}
                  fill
                  className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                  onError={(e) => {
                    // @ts-ignore - TypeScript doesn't know about the currentTarget property
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.svg";
                  }}
                />
                {discountPercentage > 0 && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full shadow">
                    %{discountPercentage}
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center">
                  <Clock size={12} className="mr-1" /> Flaş İndirim
                </div>
              </div>

              <div className="p-3 flex flex-col flex-grow">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-1.5 line-clamp-2 min-h-[40px]">
                  {product.name}
                </h3>

                <div className="mt-auto">
                  {product.discount_end_date && (
                    <div className="mb-2">
                      <CountdownTimer
                        endTime={product.discount_end_date}
                        timeBoxClassName="bg-gray-700 dark:bg-gray-600 text-white px-1 py-0.5 rounded-sm text-center min-w-[18px] text-xs"
                        separatorClassName="text-gray-500 dark:text-gray-400"
                        className="flex items-center gap-0.5 text-xs font-mono"
                      />
                    </div>
                  )}
                  <div className="flex items-baseline gap-2 mb-2">
                    {salePrice ? (
                      <>
                        <span className="text-lg font-bold text-red-600 dark:text-red-500">
                          {salePrice.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                        </span>
                        {originalPrice && originalPrice > salePrice && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 line-through">
                            {originalPrice.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                          </span>
                        )}
                      </>
                    ) : originalPrice ? (
                      <span className="text-lg font-bold text-gray-800 dark:text-white">
                        {originalPrice.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                      </span>
                    ) : (
                      <span className="text-lg font-bold text-gray-800 dark:text-white">Fiyat Yok</span>
                    )}
                  </div>

                  {(product.max_flash_quantity !== null && product.max_flash_quantity !== undefined && product.sold_count !== null && product.sold_count !== undefined) ? (
                    <div className="mt-1">
                      <Progress
                        value={(product.sold_count / product.max_flash_quantity) * 100}
                        className="h-1.5 bg-red-200 dark:bg-red-700 [&>div]:bg-red-500 dark:[&>div]:bg-red-400"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                        {product.max_flash_quantity - product.sold_count} adet kaldı
                      </p>
                    </div>
                  ) : product.stock_quantity !== null && product.stock_quantity !== undefined && product.stock_quantity <= 10 && product.stock_quantity > 0 ? (
                    <p className="text-xs text-red-500 mt-1">Son {product.stock_quantity} ürün!</p>
                  ) : null}
                </div>
              </div>
            </Link>
          )
        })}

        <Link
          href="/firsatlar/flas-urunler"
          className="flex-shrink-0 w-60 bg-gradient-to-br from-orange-500 to-red-600 dark:from-orange-600 dark:to-red-700 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col items-center justify-center p-6 text-white group"
        >
          <Zap size={48} className="mb-3 transition-transform duration-300 group-hover:scale-110" />
          <h3 className="text-lg font-semibold mb-1 text-center">Tüm Flaş Ürünler</h3>
          <p className="text-sm text-orange-100 dark:text-orange-200 mb-3 text-center">Kaçırılmayacak fırsatları gör!</p>
          <div className="mt-auto px-4 py-2 border border-white rounded-full text-sm font-medium group-hover:bg-white group-hover:text-red-600 transition-colors">
            Hemen İncele <ArrowRight size={16} className="inline ml-1" />
          </div>
        </Link>
      </div>
    </section>
  )
}

export default FlashDeals
