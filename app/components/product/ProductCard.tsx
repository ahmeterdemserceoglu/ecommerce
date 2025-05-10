import Link from "next/link"
import Image from "next/image"
import { Star } from "lucide-react"
import { useState, useEffect } from "react"
import { getSignedImageUrlForAny } from "@/lib/get-signed-url"

interface ProductVariant {
  id: string;
  price: number;
  discount_price?: number | null;
  stock_quantity?: number;
  sku?: string | null;
  is_default?: boolean | null;
  image_url?: string | null;
  // Add other variant fields if needed for the card, e.g., attributes for display
}

interface Product {
  id: string
  name: string
  slug: string;
  price: number
  discount_price?: number | null
  discount_percent?: number | null
  store: {
    name: string
  }
  rating?: number
  review_count?: number
  image_url?: string | null
  product_variants?: ProductVariant[] | null
  has_variants?: boolean | null
}

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const [signedImageUrl, setSignedImageUrl] = useState<string>("/placeholder.svg")

  // Load signed image URL when product changes
  useEffect(() => {
    async function loadSignedUrl() {
      if (product.image_url) {
        try {
          const url = await getSignedImageUrlForAny(product.image_url);
          if (url) {
            setSignedImageUrl(url);
          }
        } catch (error) {
          console.error("Error signing image URL:", error);
        }
      }
    }

    loadSignedUrl();
  }, [product.image_url]);

  // Product should already be processed by processProductData utility
  // so we can directly use price and discount_price
  const displayPrice = product.price;
  const displayDiscountPrice = product.discount_price;

  // Calculate discount percentage and determine if there's an active discount
  const hasActiveDiscount = displayDiscountPrice != null && displayDiscountPrice < displayPrice;
  const discountPercentage = hasActiveDiscount
    ? Math.round(((displayPrice - displayDiscountPrice) / displayPrice) * 100)
    : 0;

  // Determine the final price to display
  const finalPrice = hasActiveDiscount ? displayDiscountPrice : displayPrice;
  const savings = hasActiveDiscount ? displayPrice - displayDiscountPrice : 0;

  return (
    <Link href={`/urun/${product.slug}`} className="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
      <div className="overflow-hidden">
        {/* Ürün Görseli */}
        <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden relative">
          <Image
            src={signedImageUrl}
            alt={product.name}
            width={300}
            height={300}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out"
            onError={(e) => {
              // @ts-ignore - TypeScript doesn't know about the currentTarget property on error events
              const target = e.target as HTMLImageElement;
              target.src = "/placeholder.svg";
            }}
          />
          {hasActiveDiscount && discountPercentage > 0 && (
            <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-md">
              %{discountPercentage} İNDİRİM
            </div>
          )}
        </div>

        {/* Ürün Bilgileri */}
        <div className="p-4">
          {product.store && <p className="text-xs text-gray-500 mb-1 truncate">{product.store.name}</p>}
          <h3 className="text-sm font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors duration-200 truncate" title={product.name}>
            {product.name}
          </h3>

          {/* Fiyat */}
          <div className="mt-2 flex flex-col">
            {hasActiveDiscount ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-red-600">
                    {finalPrice.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                  </span>
                  <span className="text-sm text-gray-400 line-through">
                    {displayPrice.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                  </span>
                </div>
                {savings > 0 && (
                  <div className="text-xs text-green-600 font-medium mt-1">
                    {savings.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })} tasarruf
                  </div>
                )}
              </>
            ) : (
              <span className="text-xl font-bold text-gray-900">
                {finalPrice.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
              </span>
            )}
          </div>

          {/* Değerlendirme */}
          {product.rating != null && product.rating > 0 && (
            <div className="mt-2.5 flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < Math.round(product.rating!) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                />
              ))}
              {product.review_count != null && product.review_count > 0 && (
                <span className="text-xs text-gray-500">({product.review_count})</span>
              )}
            </div>
          )}
          {!product.rating && <div className="mt-2.5 h-5"></div>} {/* Placeholder for consistent height */}
        </div>
      </div>
    </Link>
  )
}
