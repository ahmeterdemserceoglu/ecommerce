"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/database.types"

interface Product {
  id: string
  name: string
  price: number
  description: string
  image_url: string
  slug: string
  store_id: string
  store_name?: string
  is_approved?: boolean
  is_active?: boolean
}

export default function ProductPageById({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    async function fetchProduct() {
      try {
        // ID ile ürünü bulalım
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, description, image_url, slug, store_id, stores(name), is_approved, is_active")
          .eq("id", params.id)
          .single()

        if (error) {
          console.error("Error fetching product:", error)
          setError("Ürün bulunamadı.")
          return
        }

        if (data) {
          // Eğer ürün onaylanmamışsa ve kullanıcı admin veya ürünün sahibi değilse, erişimi engelleyelim
          if (!data.is_approved && !data.is_active) {
            // Burada kullanıcı kontrolü yapılabilir, şimdilik basit tutuyoruz
            setError("Bu ürün henüz onaylanmamış veya aktif değil.")
            setProduct(null)
            return
          }

          const productWithStoreName = {
            ...data,
            store_name: data.stores?.name,
          }
          setProduct(productWithStoreName)

          // Eğer ürünün slug'ı varsa, slug sayfasına yönlendirelim
          if (data.slug) {
            router.push(`/urun/${data.slug}`)
          }
        }
      } catch (error) {
        console.error("Error fetching product:", error)
        setError("Ürün yüklenirken bir hata oluştu.")
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [params.id, supabase, router])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-100 rounded-lg p-4 animate-pulse h-96"></div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-4">Ürün Bulunamadı</h2>
          <p className="text-gray-500">{error || "Bu ürün mevcut değil veya kaldırılmış olabilir."}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative h-96 md:h-full">
          <Image
            src={product.image_url || "/placeholder.png"}
            alt={product.name}
            fill
            className="object-contain rounded-lg"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <p className="text-gray-600 mb-2">Satıcı: {product.store_name || "Bilinmiyor"}</p>
          <p className="text-3xl font-bold text-blue-600 mb-6">
            {product.price.toLocaleString("tr-TR", {
              style: "currency",
              currency: "TRY",
            })}
          </p>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Ürün Açıklaması</h2>
            <p className="text-gray-700">{product.description}</p>
          </div>
          <button className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors w-full md:w-auto">
            Sepete Ekle
          </button>
        </div>
      </div>
    </div>
  )
}
