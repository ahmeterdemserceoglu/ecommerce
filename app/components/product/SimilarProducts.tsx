"use client"

import { createClient } from "@supabase/supabase-js"
import { useEffect, useState } from "react"
import { ProductCard } from "./ProductCard"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface SimilarProductsProps {
  productId: string
  categoryId: string
  limit?: number
}

export default function SimilarProducts({ productId, categoryId, limit = 4 }: SimilarProductsProps) {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSimilarProducts()
  }, [productId, categoryId])

  const fetchSimilarProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:category_id (name),
          store:store_id (name)
        `)
        .eq("category_id", categoryId)
        .neq("id", productId)
        .limit(limit)

      if (error) throw error

      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching similar products:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Yükleniyor...</div>
  }

  if (products.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
