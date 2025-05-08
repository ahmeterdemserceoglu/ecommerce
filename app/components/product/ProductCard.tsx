import Link from "next/link"
import Image from "next/image"
import { Star } from "lucide-react"

interface Product {
  id: string
  name: string
  price: number
  discount_price: number
  discount_percent: number
  images: string[]
  store: {
    name: string
  }
  rating?: number
  review_count?: number
  image_url?: string
}

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.id}`} className="group">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Ürün Görseli */}
        <div className="aspect-square relative">
          <Image
            src={product.image_url || "/placeholder.png"}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {product.discount_percent > 0 && (
            <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-sm">
              %{product.discount_percent} İndirim
            </div>
          )}
        </div>

        {/* Ürün Bilgileri */}
        <div className="p-4">
          <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{product.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{product.store.name}</p>

          {/* Fiyat */}
          <div className="mt-2">
            {product.discount_percent > 0 ? (
              <>
                <div className="text-lg font-bold text-red-600">
                  {product.discount_price.toLocaleString("tr-TR", {
                    style: "currency",
                    currency: "TRY",
                  })}
                </div>
                <div className="text-sm text-gray-500 line-through">
                  {product.price.toLocaleString("tr-TR", {
                    style: "currency",
                    currency: "TRY",
                  })}
                </div>
              </>
            ) : (
              <div className="text-lg font-bold">
                {product.price.toLocaleString("tr-TR", {
                  style: "currency",
                  currency: "TRY",
                })}
              </div>
            )}
          </div>

          {/* Değerlendirme */}
          {product.rating && (
            <div className="mt-2 flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
              {product.review_count && <span className="text-sm text-gray-500">({product.review_count})</span>}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
