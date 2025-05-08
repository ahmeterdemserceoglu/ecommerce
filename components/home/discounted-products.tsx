import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { formatPrice } from "@/lib/utils"

interface DiscountedProduct {
  id: string
  name: string
  image: string
  originalPrice: number
  discountedPrice: number
  discountPercentage: number
  store: {
    name: string
    id: string
  }
}

export function DiscountedProducts({ products }: { products: DiscountedProduct[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {products.map((product) => (
        <Link href={`/urun/${product.id}`} key={product.id}>
          <Card className="group hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-4">
              <div className="relative aspect-square mb-4">
                <Image src={product.image} alt={product.name} fill className="object-cover rounded-lg" />
                <Badge className="absolute top-2 right-2 bg-red-500 text-white">
                  %{product.discountPercentage} İndirim
                </Badge>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium line-clamp-2 group-hover:text-primary">{product.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary">{formatPrice(product.discountedPrice)}</span>
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{product.store.name}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
