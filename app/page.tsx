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
import { processProductData } from "@/lib/product-utils"

export const dynamic = "force-dynamic"

// Updated Product Type Definition
type ProductVariant = {
  id?: string; // product_variants tablosunda id varsa
  price: number | null;
  discount_price: number | null;
  is_default: boolean;
  // İhtiyaç duyulabilecek diğer varyant alanları
};

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  stores: {
    id: string;
    name: string;
  } | { id: string; name: string }[]; // stores array veya object olabilir, düzeltildi
  product_variants?: ProductVariant[];
};

export default async function Home() {
  const supabase = createServerComponentClient<Database>({ cookies })

  // Process products to handle stores format
  const normalizeStores = (product: any) => {
    let actualStore = Array.isArray(product.stores) ? product.stores[0] : product.stores;
    return {
      ...product,
      // Normalize the stores field
      stores: actualStore || { id: product.store_id, name: "Bilinmeyen Mağaza" }
    };
  };

  // Fetch featured products
  const { data: featuredProductsData, error: featuredError } = await supabase
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
      ),
      product_variants (id, price, discount_price, is_default)
    `)
    .eq("is_featured", true)
    .eq("is_active", true)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(10)

  if (featuredError) {
    console.error("Error fetching featured products:", featuredError.message)
  }

  // Fetch discounted products
  const { data: discountedProductsData, error: discountedError } = await supabase
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
      ),
      product_variants (id, price, discount_price, is_default)
    `)
    .not("discount_price", "is", null)
    .eq("is_active", true)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(10)

  if (discountedError) {
    console.error("Error fetching discounted products:", discountedError.message)
  }

  // Fetch Flash Sale Products
  const now = new Date().toISOString();
  const { data: flashSaleItemsData, error: flashSaleError } = await supabase
    .from('flash_sale_products')
    .select(`
      id,
      flash_sale_price,
      start_time,
      end_time,
      max_quantity,
      sold_quantity,
      product:products!inner (
        id,
        name,
        slug,
        price,
        image_url,
        description,
        stock_quantity,
        stores (id, name),
        product_variants (id, price, discount_price, is_default)
      )
    `)
    .eq('is_active', true)
    .lte('start_time', now)
    .gte('end_time', now)
    .order('end_time', { ascending: true });

  if (flashSaleError) {
    console.error("Error fetching flash sale products:", flashSaleError.message);
  }

  // If no flash sale products are available, fetch products with > 50% discount
  let highDiscountProducts = [];
  if (!flashSaleItemsData || flashSaleItemsData.length === 0) {
    const { data: discountedProductsHighData } = await supabase
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
        has_variants,
        created_at,
        image_url,
        is_approved,
        stores!inner (
          id,
          name
        ),
        product_variants (id, price, discount_price, is_default)
      `)
      .not("discount_price", "is", null)
      .eq("is_active", true)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(10);

    // Find products with > 50% discount
    if (discountedProductsHighData && discountedProductsHighData.length > 0) {
      const processedHighDiscount = discountedProductsHighData
        .map(product => normalizeStores(processProductData(product)))
        .filter(p => {
          if (p.price && p.discount_price && p.price > 0) {
            const discountPercent = ((p.price - p.discount_price) / p.price) * 100;
            return discountPercent >= 50;
          }
          return false;
        })
        .map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          image_url: p.image_url,
          price: p.price,
          discount_price: p.discount_price,
          discount_end_date: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
          stock_quantity: p.stock_quantity,
          store: p.stores
        }));

      highDiscountProducts = processedHighDiscount;
    }
  }

  // Apply processProductData for variant prices and normalize stores
  const formattedFeaturedProducts = (featuredProductsData || [])
    .map(product => normalizeStores(processProductData(product)))
    .filter(p => p.is_active && p.is_approved);

  const formattedDiscountedProducts = (discountedProductsData || [])
    .map(product => normalizeStores(processProductData(product)))
    .filter(p => p.is_active && p.is_approved);

  const formattedFlashSaleProducts = flashSaleItemsData
    ?.filter(item => item.product && item.product.is_active && item.product.is_approved)
    .map(item => {
      // First apply product utils to handle variant pricing
      const processedProduct = processProductData(item.product);
      // Then normalize the stores format
      const normalizedProduct = normalizeStores(processedProduct);

      return {
        ...item, // Keep flash sale specific fields like flash_sale_price, end_time
        product: normalizedProduct, // Use the processed product
        // Ensure the final structure matches what FlashDeals and ProductCard expect
        id: normalizedProduct.id, // Use product id for key if item.id is flash_sale_products id
        name: normalizedProduct.name,
        slug: normalizedProduct.slug,
        image_url: normalizedProduct.image_url,
        price: normalizedProduct.price, // Original price from processed product (handles variants)
        discount_price: item.flash_sale_price, // Flash sale price as discount_price
        discount_end_date: item.end_time, // For countdown
        stock_quantity: normalizedProduct.stock_quantity,
        sold_count: item.sold_quantity,
        max_flash_quantity: item.max_quantity,
        store: normalizedProduct.stores // Ensure store info is available for ProductCard
      };
    }) || [];

  // Add this after formattedFlashSaleProducts definition
  const allFlashSaleProducts = formattedFlashSaleProducts.length > 0
    ? formattedFlashSaleProducts
    : highDiscountProducts;

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
            <FlashDeals products={allFlashSaleProducts} />
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
            <FeaturedProducts products={formattedFeaturedProducts} />
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
            <DiscountedProductsShowcase products={formattedDiscountedProducts} />
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
