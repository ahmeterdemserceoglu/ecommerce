"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { formatPrice } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRef, useState, useEffect } from "react"
import type { Database } from "@/types/database.types"
import { processProductData } from "@/lib/product-utils"
import { getSignedImageUrlForAny } from "@/lib/get-signed-url"

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  stores: {
    id: string
    name: string
  },
  product_variants?: {
    id: string;
    price: number | null;
    discount_price?: number | null;
    is_default?: boolean | null;
  }[];
}

interface DiscountedProductsShowcaseProps {
  products: Product[]
}

export function DiscountedProductsShowcase({ products }: DiscountedProductsShowcaseProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [signedImageUrls, setSignedImageUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    async function signImages() {
      const urlPromises = products.map(async (product) => {
        if (product.image_url) {
          try {
            const signedUrl = await getSignedImageUrlForAny(product.image_url);
            return { id: product.id, url: signedUrl || "/placeholder.svg" };
          } catch (error) {
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
    if (products.length > 0) signImages();
  }, [products]);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400
      const currentScroll = scrollContainerRef.current.scrollLeft
      const targetScroll = direction === "left" ? currentScroll - scrollAmount : currentScroll + scrollAmount

      scrollContainerRef.current.scrollTo({
        left: targetScroll,
        behavior: "smooth",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">İndirimli Ürünler</h2>
          <p className="text-muted-foreground">En iyi fırsatları kaçırmayın!</p>
        </div>
        <Link href="/firsatlar" className="text-primary hover:underline">
          Tümünü Gör
        </Link>
      </div>

      <div className="relative">
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-background/80 backdrop-blur-sm"
          onClick={() => scroll("left")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {products.map((product) => {
            // Process product to handle variant pricing
            const processedProduct = processProductData(product);
            const discountPercentage = processedProduct.discount_price
              ? Math.round(((processedProduct.price - processedProduct.discount_price) / processedProduct.price) * 100)
              : 0;
            const productImageUrl = signedImageUrls[product.id] || "/placeholder.svg";

            return (
              <Link href={`/urun/${product.id}`} key={product.id} className="flex-none w-[280px]">
                <Card className="group hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-4">
                    <div className="relative aspect-square mb-4">
                      <Image
                        src={productImageUrl}
                        alt={product.name}
                        fill
                        className="object-cover rounded-lg"
                      />
                      <Badge className="absolute top-2 right-2 bg-red-500 text-white">
                        %{discountPercentage} İndirim
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium line-clamp-2 group-hover:text-primary">{product.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">{formatPrice(processedProduct.discount_price || processedProduct.price)}</span>
                        {processedProduct.discount_price && (
                          <span className="text-sm text-muted-foreground line-through">{formatPrice(processedProduct.price)}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{product.stores?.name || "Bilinmeyen Mağaza"}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-background/80 backdrop-blur-sm"
          onClick={() => scroll("right")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
