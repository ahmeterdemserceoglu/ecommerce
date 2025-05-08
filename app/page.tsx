import { Suspense } from "react"
import { HeroCarousel } from "@/components/home/hero-carousel"
import { CategoryShowcase } from "@/components/home/category-showcase"
import DailyDeals from "@/components/home/daily-deals"
import FlashDeals from "@/components/home/flash-deals"
import { FeaturedProducts } from "@/components/home/featured-products"
import { TrendingProducts } from "@/components/home/trending-products"
import { PopularStores } from "@/components/home/popular-stores"
import BrandShowcase from "@/components/home/brand-showcase"
import NewsletterSignup from "@/components/home/newsletter-signup"
import MobileAppPromo from "@/components/home/mobile-app-promo"
import ShippingInfo from "@/components/home/shipping-info"
import { CategoryNav } from "@/components/home/category-nav"
import { RecentlyViewed } from "@/components/home/recently-viewed"
import { HeroSection } from "@/components/home/hero-section"
import { DiscountedProductsShowcase } from "@/components/home/discounted-products-showcase"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/types/database.types"
import Footer from "@/components/layout/footer"

export const dynamic = "force-dynamic"

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  stores: {
    id: string
    name: string
  }
}

export default async function Home() {
  const supabase = createServerComponentClient<Database>({ cookies })

  // Fetch featured products
  const { data: featuredProducts } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      description,
      price,
      discount_price,
      stock_quantity,
      category_id,
      store_id,
      is_active,
      is_featured,
      has_variants,
      created_at,
      image_url,
      is_approved,
      reject_reason,
      approved_at,
      approved_by,
      submitted_at,
      stores!inner (
        id,
        name
      )
    `)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(10)

  // Fetch discounted products
  const { data: discountedProducts } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      description,
      price,
      discount_price,
      stock_quantity,
      category_id,
      store_id,
      is_active,
      is_featured,
      has_variants,
      created_at,
      image_url,
      is_approved,
      reject_reason,
      approved_at,
      approved_by,
      submitted_at,
      stores!inner (
        id,
        name
      )
    `)
    .not("discount_price", "is", null)
    .order("created_at", { ascending: false })
    .limit(10)

  // Transform the data to match the expected type
  const formattedFeaturedProducts =
    featuredProducts?.map((product) => ({
      ...product,
      stores: product.stores[0],
    })) || []

  const formattedDiscountedProducts =
    discountedProducts?.map((product) => ({
      ...product,
      stores: product.stores[0],
    })) || []

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
      {/* Kategori Navigasyonu */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <Suspense fallback={<div className="h-12 bg-gray-100 animate-pulse" />}>
            <CategoryNav />
          </Suspense>
        </div>
      </div>

      <HeroSection />

      {/* Hero Carousel */}
      <section>
        <Suspense fallback={<div className="h-[400px] bg-gray-100 animate-pulse" />}>
          <HeroCarousel />
        </Suspense>
      </section>

      {/* Kargo Bilgisi */}
      <section>
        <ShippingInfo />
      </section>

      <div className="max-w-7xl mx-auto space-y-16 py-12 px-4">
        {/* Günün Fırsatları */}
        <section>
          <Suspense fallback={<div className="h-40 bg-gray-100 animate-pulse" />}>
            <DailyDeals />
          </Suspense>
        </section>

        {/* Kategoriler */}
        <section>
          <Suspense fallback={<div className="h-40 bg-gray-100 animate-pulse" />}>
            <CategoryShowcase />
          </Suspense>
        </section>

        {/* Flash Fırsatlar */}
        <section>
          <Suspense fallback={<div className="h-40 bg-gray-100 animate-pulse" />}>
            <FlashDeals />
          </Suspense>
        </section>

        {/* Trend Ürünler */}
        <section>
          <Suspense fallback={<div className="h-40 bg-gray-100 animate-pulse" />}>
            <TrendingProducts />
          </Suspense>
        </section>

        {/* Öne Çıkan Ürünler */}
        <section>
          <Suspense fallback={<div className="h-40 bg-gray-100 animate-pulse" />}>
            <FeaturedProducts products={formattedFeaturedProducts as Product[]} />
          </Suspense>
        </section>

        {/* Popüler Markalar */}
        <section>
          <Suspense fallback={<div className="h-40 bg-gray-100 animate-pulse" />}>
            <BrandShowcase />
          </Suspense>
        </section>

        {/* Popüler Mağazalar */}
        <section>
          <Suspense fallback={<div className="h-40 bg-gray-100 animate-pulse" />}>
            <PopularStores />
          </Suspense>
        </section>

        {/* Son Görüntülenenler */}
        <section>
          <RecentlyViewed />
        </section>

        {/* İndirimli Ürünler */}
        <section>
          <Suspense fallback={<div className="h-40 bg-gray-100 animate-pulse" />}>
            <DiscountedProductsShowcase products={formattedDiscountedProducts as Product[]} />
          </Suspense>
        </section>
      </div>

      {/* Newsletter ve Mobil Uygulama */}
      <section className="max-w-7xl mx-auto py-12 px-4 flex flex-col md:flex-row gap-10">
        <NewsletterSignup />
        <MobileAppPromo />
      </section>

      <Footer />
    </main>
  )
}
