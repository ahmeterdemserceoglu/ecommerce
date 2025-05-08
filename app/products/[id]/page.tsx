import { createClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import ProductReviews from "@/components/product/ProductReviews"
import SimilarProducts from "@/components/product/SimilarProducts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Product {
  id: string
  name: string
  description: string
  price: number
  discount_price: number
  discount_percent: number
  stock_quantity: number
  image_url: string
  category: {
    id: string
    name: string
  }
  store: {
    name: string
  }
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const { data: product, error } = await supabase
    .from("products")
    .select(`
      *,
      category:category_id (id, name),
      store:store_id (name)
    `)
    .eq("id", params.id)
    .single()

  if (error || !product) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Ürün Görselleri */}
        <div className="space-y-4">
          <div className="aspect-square relative rounded-lg overflow-hidden">
            <img
              src={product.image_url || "/placeholder.png"}
              alt={product.name}
              className="object-cover w-full h-full"
            />
          </div>
          {/* Çoklu görsel desteği yoksa bu kısmı kaldırıyoruz */}
        </div>

        {/* Ürün Bilgileri */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="text-gray-500">{product.store.name}</p>
          </div>

          <div className="space-y-2">
            {product.discount_percent > 0 ? (
              <>
                <div className="text-2xl font-bold text-red-600">
                  {product.discount_price.toLocaleString("tr-TR", {
                    style: "currency",
                    currency: "TRY",
                  })}
                </div>
                <div className="text-gray-500 line-through">
                  {product.price.toLocaleString("tr-TR", {
                    style: "currency",
                    currency: "TRY",
                  })}
                </div>
                <div className="text-sm text-red-600">%{product.discount_percent} indirim</div>
              </>
            ) : (
              <div className="text-2xl font-bold">
                {product.price.toLocaleString("tr-TR", {
                  style: "currency",
                  currency: "TRY",
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Adet</label>
              <Input type="number" min="1" max={product.stock_quantity} defaultValue="1" className="w-24" />
            </div>
            <Button className="w-full">Sepete Ekle</Button>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-2">Ürün Özellikleri</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Kategori</span>
                <span>{product.category.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Stok Durumu</span>
                <span>{product.stock_quantity > 0 ? "Stokta var" : "Stokta yok"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ürün Detayları */}
      <div className="mt-12">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Ürün Detayları</h2>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: product.description }} />
        </div>
      </div>

      {/* Ürün Değerlendirmeleri */}
      <div className="mt-12">
        <ProductReviews productId={product.id} />
      </div>

      {/* Benzer Ürünler */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-6">Benzer Ürünler</h2>
        <SimilarProducts productId={product.id} categoryId={product.category.id} limit={4} />
      </div>
    </div>
  )
}
