import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { getSignedImageUrlForAny } from "@/lib/get-signed-url"
import { processProductData } from "@/lib/product-utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { formatPrice } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Flaş İndirimli Ürünler | En Büyük İndirimler | Siteniz.com",
    description: "%50 ve üzeri indirimli tüm ürünler burada! Kaçırılmayacak fırsatlar, en iyi fiyatlar ve hızlı alışveriş deneyimi.",
    openGraph: {
        title: "Flaş İndirimli Ürünler | Siteniz.com",
        description: "%50 ve üzeri indirimli tüm ürünler burada! Kaçırılmayacak fırsatlar, en iyi fiyatlar ve hızlı alışveriş deneyimi.",
        url: "https://siteniz.com/firsatlar/flas-urunler",
        siteName: "Siteniz.com",
        images: [
            {
                url: "/og-flash-deals.png",
                width: 1200,
                height: 630,
                alt: "Flaş İndirimli Ürünler | Siteniz.com"
            }
        ],
        locale: "tr_TR",
        type: "website"
    },
    twitter: {
        card: "summary_large_image",
        title: "Flaş İndirimli Ürünler | Siteniz.com",
        description: "%50 ve üzeri indirimli tüm ürünler burada! Kaçırılmayacak fırsatlar, en iyi fiyatlar ve hızlı alışveriş deneyimi.",
        images: ["/og-flash-deals.png"]
    }
}

export default async function FlashDealsPage() {
    const supabase = createServerComponentClient({ cookies })
    const { data: productsData } = await supabase
        .from("products")
        .select(`
      id,
      name,
      slug,
      price,
      discount_price,
      image_url,
      stock_quantity,
      stores:store_id (id, name),
      product_variants (id, price, discount_price, is_default)
    `)
        .eq("is_active", true)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(100)

    // Process and filter products with >= 50% discount
    const processed = (productsData || []).map(processProductData)
    const flashProducts = processed.filter(p => {
        if (p.price && p.discount_price && p.price > 0) {
            const percent = ((p.price - p.discount_price) / p.price) * 100
            return percent >= 50
        }
        return false
    })

    // Get signed image URLs
    const productsWithSignedImages = await Promise.all(
        flashProducts.map(async (p) => {
            let signedUrl = "/placeholder.svg"
            if (p.image_url) {
                const url = await getSignedImageUrlForAny(p.image_url)
                if (url) signedUrl = url
            }
            return { ...p, signedImageUrl: signedUrl }
        })
    )

    return (
        <div className="max-w-7xl mx-auto px-4 py-10">
            <h1 className="text-3xl font-bold mb-2">Flaş İndirimli Ürünler</h1>
            <p className="text-muted-foreground mb-8">%50 ve üzeri indirimli tüm ürünler burada!</p>
            {productsWithSignedImages.length === 0 ? (
                <div className="text-center text-gray-500 py-20">Şu anda flaş indirimli ürün bulunmamaktadır.</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {productsWithSignedImages.map(product => {
                        const discountPercent = Math.round(((product.price - product.discount_price) / product.price) * 100)
                        return (
                            <Link href={`/urun/${product.slug || product.id}`} key={product.id}>
                                <Card className="group hover:shadow-lg transition-shadow duration-200">
                                    <CardContent className="p-4">
                                        <div className="relative aspect-square mb-4">
                                            <Image
                                                src={product.signedImageUrl}
                                                alt={product.name}
                                                fill
                                                className="object-cover rounded-lg"
                                            />
                                            <Badge className="absolute top-2 right-2 bg-red-500 text-white">
                                                %{discountPercent} İndirim
                                            </Badge>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="font-medium line-clamp-2 group-hover:text-primary">{product.name}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold text-primary">{formatPrice(product.discount_price)}</span>
                                                <span className="text-sm text-muted-foreground line-through">{formatPrice(product.price)}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{product.stores?.name || "Bilinmeyen Mağaza"}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
} 