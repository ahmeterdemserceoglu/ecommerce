"use client"
import Link from "next/link"
import type { Database } from "@/types/database.types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"
import { ProductCardImage } from "@/components/ProductCardImage"

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  stores: {
    id: string
    name: string
  }
}

interface FeaturedProductsProps {
  products: Product[]
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Öne Çıkan Ürünler</h2>
        <Link href="/one-cikanlar" className="text-primary hover:underline">
          Tümünü Gör
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {products.map((product) => {
          const discountPercentage = product.discount_price
            ? Math.round(((product.price - product.discount_price) / product.price) * 100)
            : 0

          return (
            <Link href={`/urun/${product.id}`} key={product.id}>
              <Card className="group hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-4">
                  <div className="relative aspect-square mb-4">
                    <ProductCardImage product={product} className="object-cover rounded-lg w-full h-full" />
                    {discountPercentage > 0 && (
                      <Badge className="absolute top-2 right-2 bg-red-500 text-white">
                        %{discountPercentage} İndirim
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium line-clamp-2 group-hover:text-primary">{product.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">
                        {formatPrice(product.discount_price || product.price)}
                      </span>
                      {product.discount_price && (
                        <span className="text-sm text-muted-foreground line-through">{formatPrice(product.price)}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{product.stores.name}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
