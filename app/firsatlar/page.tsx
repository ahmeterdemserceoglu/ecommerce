import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/types/database.types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { formatPrice } from "@/lib/utils"
import { processProductData, getDiscountPercentage } from "@/lib/product-utils"

export const dynamic = "force-dynamic"

export default async function DealProductsPage() {
  const supabase = createServerComponentClient<Database>({ cookies })

  // First get all products with their variants
  const { data: rawProducts } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      price,
      discount_price,
      image_url,
      store_id,
      has_variants,
      product_variants(*),
      stores!inner (
        id,
        name
      )
    `)
    .order("created_at", { ascending: false })
    .limit(50)

  // Process the products to get the correct pricing including variants
  const processed = rawProducts ? rawProducts.map(product => processProductData(product)) : []

  // Filter to only include products with discounts
  const products = processed.filter(product =>
    product.discount_price !== null &&
    product.discount_price < product.price
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Fırsat Ürünleri</h1>
          <p className="text-muted-foreground">En iyi fırsatları kaçırmayın! İndirimli ürünlerimizi keşfedin</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {products?.map((product) => {
            const discountPercentage = getDiscountPercentage(product)

            return (
              <Link href={`/urun/${product.slug}`} key={product.id}>
                <Card className="group hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-4">
                    <div className="relative aspect-square mb-4">
                      <Image
                        src={product.image_url || "/placeholder.png"}
                        alt={product.name}
                        fill
                        className="object-cover rounded-lg"
                      />
                      <Badge className="absolute top-2 right-2 bg-red-500 text-white">
                        %{discountPercentage} İndirim
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium line-clamp-2 group-hover:text-primary">{product.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">{formatPrice(product.discount_price!)}</span>
                        <span className="text-sm text-muted-foreground line-through">{formatPrice(product.price)}</span>
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
    </div>
  )
}
