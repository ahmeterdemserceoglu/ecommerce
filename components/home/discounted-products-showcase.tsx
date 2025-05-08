"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { formatPrice } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRef } from "react"
import type { Database } from "@/types/database.types"

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  stores: {
    id: string
    name: string
  }
}

interface DiscountedProductsShowcaseProps {
  products: Product[]
}

export function DiscountedProductsShowcase({ products }: DiscountedProductsShowcaseProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

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
            const discountPercentage = Math.round(((product.price - product.discount_price!) / product.price) * 100)

            return (
              <Link href={`/urun/${product.id}`} key={product.id} className="flex-none w-[280px]">
                <Card className="group hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-4">
                    <div className="relative aspect-square mb-4">
                      <Image
                        src={product.image_url || "/placeholder.png"}
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
                        <span className="text-lg font-bold text-primary">{formatPrice(product.discount_price!)}</span>
                        <span className="text-sm text-muted-foreground line-through">{formatPrice(product.price)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{product.stores.name}</p>
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
