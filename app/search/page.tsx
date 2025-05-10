"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from 'next/navigation'
import { createClient } from "@supabase/supabase-js"
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ProductCard } from '@/app/components/product/ProductCard'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Brand {
  id: string;
  name: string;
  slug: string;
}

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <SearchPage />
    </Suspense>
  )
}

function SearchPage() {
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const [filters, setFilters] = useState<any>({ brand: null })
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [availableBrands, setAvailableBrands] = useState<Brand[]>([])

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch('/api/brands');
        if (!response.ok) throw new Error('Markalar yüklenemedi');
        const data = await response.json();
        setAvailableBrands(data || []);
      } catch (error) {
        console.error("Error fetching brands for filter:", error);
        setAvailableBrands([]);
      }
    };
    fetchBrands();
  }, []);

  const fetchProducts = async (currentSearchTerm?: string, currentFilters?: any) => {
    setLoading(true)
    const termToUse = currentSearchTerm !== undefined ? currentSearchTerm : searchTerm;
    const filtersToUse = currentFilters || filters;

    let query = supabase.from("products")
      .select("*, store:stores(name), category:categories(name), brand:brands(name, slug)")
      .eq('is_active', true)
      .eq('is_approved', true)

    if (termToUse) {
      query = query.ilike("name", `%${termToUse}%`)
    }
    if (filtersToUse.category) query = query.eq("category_id", filtersToUse.category)
    if (filtersToUse.brand) query = query.eq("brand_id", filtersToUse.brand)
    if (filtersToUse.minPrice) query = query.gte("price", Number(filtersToUse.minPrice))
    if (filtersToUse.maxPrice) query = query.lte("price", Number(filtersToUse.maxPrice))
    if (filtersToUse.rating) query = query.gte("rating", Number(filtersToUse.rating))
    if (filtersToUse.stock === "in") query = query.gt("stock_quantity", 0)
    if (filtersToUse.stock === "out") query = query.eq("stock_quantity", 0)
    if (filtersToUse.discount === "yes") query = query.gt("discount_percent", 0)
    if (filtersToUse.discount === "no") query = query.eq("discount_percent", 0)
    if (filtersToUse.new) query = query.gte("created_at", new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString())
    if (filtersToUse.seller) query = query.eq("store_name", filtersToUse.seller)
    if (filtersToUse.sort === "price_asc") query = query.order("price", { ascending: true })
    if (filtersToUse.sort === "price_desc") query = query.order("price", { ascending: false })
    if (filtersToUse.sort === "new") query = query.order("created_at", { ascending: false })
    if (filtersToUse.sort === "popular") query = query.order("review_count", { ascending: false })
    if (filtersToUse.sort === "discount") query = query.order("discount_percent", { ascending: false })
    const { data, error } = await query.limit(40)
    setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts(searchTerm, filters)
  }, [filters])

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = () => {
    fetchProducts(searchTerm, filters);
  };

  const handleBrandFilterChange = (brandId: string | null) => {
    setFilters((prevFilters: any) => ({ ...prevFilters, brand: brandId }));
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Ürün Arama</h1>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Ürün adı ara..."
            value={searchTerm}
            onChange={handleSearchInputChange}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
            className="flex-grow"
          />
          <Button onClick={handleSearchSubmit}>Ara</Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/4">
          <Card>
            <CardHeader>
              <CardTitle>Filtreler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Marka</h3>
                <div className="space-y-2">
                  <div key="all-brands" className="flex items-center space-x-2">
                    <Checkbox
                      id="all-brands"
                      checked={!filters.brand}
                      onCheckedChange={() => handleBrandFilterChange(null)}
                    />
                    <Label htmlFor="all-brands" className="font-normal">Tüm Markalar</Label>
                  </div>
                  {availableBrands.map((brand) => (
                    <div key={brand.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`brand-${brand.id}`}
                        checked={filters.brand === brand.id}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleBrandFilterChange(brand.id);
                          } else if (filters.brand === brand.id) {
                            handleBrandFilterChange(null);
                          }
                        }}
                      />
                      <Label htmlFor={`brand-${brand.id}`} className="font-normal">{brand.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              {searchTerm || Object.values(filters).some(f => f) ? 'Aramanızla eşleşen ürün bulunamadı.' : 'Lütfen arama yapın veya filtre seçin.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
