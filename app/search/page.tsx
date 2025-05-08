"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function SearchPage() {
  const [filters, setFilters] = useState<any>({})
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchProducts = async (searchQuery?: string) => {
    setLoading(true)
    let query = supabase.from("products").select("*")
    if (searchQuery) {
      query = query.ilike("name", `%${searchQuery}%`)
    }
    if (filters.category) query = query.eq("category", filters.category)
    if (filters.brand) query = query.eq("brand", filters.brand)
    if (filters.minPrice) query = query.gte("price", Number(filters.minPrice))
    if (filters.maxPrice) query = query.lte("price", Number(filters.maxPrice))
    if (filters.rating) query = query.gte("rating", Number(filters.rating))
    if (filters.stock === "in") query = query.gt("stock_quantity", 0)
    if (filters.stock === "out") query = query.eq("stock_quantity", 0)
    if (filters.discount === "yes") query = query.gt("discount_percent", 0)
    if (filters.discount === "no") query = query.eq("discount_percent", 0)
    if (filters.new) query = query.gte("created_at", new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString())
    if (filters.seller) query = query.eq("store_name", filters.seller)
    // Sıralama
    if (filters.sort === "price_asc") query = query.order("price", { ascending: true })
    if (filters.sort === "price_desc") query = query.order("price", { ascending: false })
    if (filters.sort === "new") query = query.order("created_at", { ascending: false })
    if (filters.sort === "popular") query = query.order("review_count", { ascending: false })
    if (filters.sort === "discount") query = query.order("discount_percent", { ascending: false })
    const { data, error } = await query.limit(40)
    setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line
  }, [filters])

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row gap-8 mt-8">
        <div className="flex-1">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
          ) : (
            <ProductGrid products={products} />
          )}
        </div>
      </div>
    </div>
  )
}
