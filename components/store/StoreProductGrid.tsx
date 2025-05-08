"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart } from "lucide-react"
import { supabase } from "@/lib/database"

interface Product {
  id: string
  name: string
  slug: string
  price: number
  discount_price: number | null
  image_url: string
  images: ProductImage[]
  is_featured: boolean
  category_id: string
  store_id: string
}

interface ProductImage {
  id: string
  url: string
  alt_text: string | null
  is_primary: boolean
}

interface StoreProductGridProps {
  storeId: string
  limit?: number
  showLoadMore?: boolean
}

export default function StoreProductGrid({ storeId, limit = 12, showLoadMore = true }: StoreProductGridProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (storeId) {
      fetchProducts()
    }
  }, [storeId, page])

  const fetchProducts = async () => {
    setIsLoading(true)

    try {
      // Use the function we created in SQL to get products with images
      const { data, error } = await supabase
        .rpc("get_store_products_with_images", { store_id: storeId })
        .range((page - 1) * limit, page * limit - 1)

      if (error) throw error

      if (data) {
        if (page === 1) {
          setProducts(data)
        } else {
          setProducts((prev) => [...prev, ...data])
        }

        setHasMore(data.length === limit)
      }
    } catch (error) {
      console.error("Error fetching store products:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadMore = () => {
    setPage((prev) => prev + 1)
  }

  const getProductImage = (product: Product) => {
    if (product.image_url) {
      return product.image_url
    }
    return product.image_url || "/placeholder.svg?height=200&width=200"
  }

  const getDiscountPercentage = (original: number, discounted: number) => {
    return Math.round(((original - discounted) / original) * 100)
  }

  if (isLoading && products.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <CardContent className="p-4">
              <Skeleton className="h-4 w-2/3 mb-2" />
              <Skeleton className="h-6 w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (products.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-2">No products found</h3>
        <p className="text-muted-foreground">This store hasn't added any products yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <Link href={`/products/${product.id}`} key={product.id}>
            <Card className="overflow-hidden h-full flex flex-col transition-all hover:shadow-md">
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                <img
                  src={getProductImage(product) || "/placeholder.svg"}
                  alt={product.name}
                  className="object-cover w-full h-full"
                />
                {product.is_featured && <Badge className="absolute top-2 left-2">Featured</Badge>}
                {product.discount_price && (
                  <Badge variant="destructive" className="absolute top-2 right-2">
                    {getDiscountPercentage(product.price, product.discount_price)}% OFF
                  </Badge>
                )}
              </div>
              <CardContent className="p-4 flex-grow">
                <h3 className="font-medium line-clamp-2">{product.name}</h3>
                <div className="mt-2 flex items-center">
                  {product.discount_price ? (
                    <>
                      <span className="font-bold text-primary">₺{product.discount_price.toFixed(2)}</span>
                      <span className="ml-2 text-sm text-muted-foreground line-through">
                        ₺{product.price.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold text-primary">₺{product.price.toFixed(2)}</span>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button variant="secondary" size="sm" className="w-full">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>

      {showLoadMore && hasMore && (
        <div className="flex justify-center mt-8">
          <Button variant="outline" onClick={handleLoadMore} disabled={isLoading}>
            {isLoading ? "Loading..." : "Load More Products"}
          </Button>
        </div>
      )}
    </div>
  )
}
