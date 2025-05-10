"use client"

import React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Star, MapPin, Heart, MessageCircle, Phone, Mail, Store, Package, ShieldCheck } from "lucide-react"
import { cn, encodeUrlParam } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getSignedImageUrlForAny } from "@/lib/get-signed-url"
import type { Database } from "@/types/supabase"

export default function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)

  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [store, setStore] = useState<
    | (Database["public"]["Tables"]["stores"]["Row"] & {
      category: Database["public"]["Tables"]["categories"]["Row"] | null
      owner: { full_name: string | null; email: string | null } | null
      // Manually adding potentially missing or differently named fields to satisfy UI
      product_count?: number
      phone?: string | null // UI uses store.phone, schema has contact_phone
      email?: string | null // UI uses store.email, schema has contact_email
      website?: string | null
      opening_hours?: any | null // Type as any for now if structure is complex/unknown
      owner_id?: string | null // Explicitly add if base Row type is missing it
      // follower_count removed as the feature is being removed
    })
    | null
  >(null)
  const [products, setProducts] = useState<any[]>([])
  const [reviews, setReviews] = useState<Array<Database["public"]["Tables"]["store_reviews"]["Row"] & { user: { full_name: string | null, email: string | null } | null }>>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState("newest")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const productsPerPage = 20
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState<number | null>(0)
  const [comment, setComment] = useState("")

  useEffect(() => {
    const fetchStore = async () => {
      setLoading(true)
      let currentStore: Database["public"]["Tables"]["stores"]["Row"] & { category: Database["public"]["Tables"]["categories"]["Row"] | null, owner: { full_name: string | null, email: string | null } | null } | null = null;

      try {
        // Fetch store data
        const { data: storeData, error: storeError } = await supabase
          .from("stores")
          .select(`
            *,
            category:categories(name),
            owner:profiles!stores_owner_id_fkey(full_name, email)
          `)
          .eq("slug", slug as string)
          .single()

        if (storeError) {
          console.error("Mağaza yüklenirken hata:", storeError.message)
          // Try to fetch by ID if slug might be an ID
          if (slug && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(slug)) {
            const { data: storeById, error: storeByIdError } = await supabase
              .from("stores")
              .select(`
                *,
                category:categories(name),
                owner:profiles!stores_owner_id_fkey(full_name, email)
              `)
              .eq("id", slug as string)
              .single()

            if (storeByIdError) {
              console.error("ID ile mağaza arama hatası:", storeByIdError.message)
              setStore(null)
              return
            }

            if (!storeById) {
              setStore(null)
              return
            }
            currentStore = storeById as any;

            // Redirect to proper slug URL if found by ID
            if (currentStore && currentStore.slug && currentStore.slug !== slug) {
              router.replace(`/magaza/${currentStore.slug}`)
              return
            }
            setStore(currentStore)
          } else {
            setStore(null)
            return
          }
        } else if (!storeData) {
          setStore(null)
          return
        } else {
          currentStore = storeData as any;
          setStore(currentStore)
        }

        // Fetch store reviews with user data
        if (currentStore && currentStore.id) {
          const { data: reviewsData, error: reviewsError } = await supabase
            .from("store_reviews")
            .select(`
                *,
                user:profiles(full_name, email)
            `)
            .eq("store_id", currentStore.id as string)
            .order("created_at", { ascending: false })
            .limit(5)

          if (reviewsError) {
            console.error("Değerlendirmeler yüklenirken hata:", reviewsError.message)
            setReviews([])
          } else {
            setReviews((reviewsData as any[] || []))
          }
        }

        // Fetch store products
        if (currentStore && currentStore.id) {
          const { data: productsData, error: productsError } = await supabase
            .from("products")
            .select(`*, product_images:product_images(id, url, is_primary, alt_text)`)
            .eq("store_id", currentStore.id)
            .eq("is_active", true as boolean)
            .eq("is_approved", true as boolean)
            .order("created_at", { ascending: false })

          if (productsError) {
            console.error("Ürünler yüklenirken hata:", productsError.message)
            setProducts([])
          } else if (productsData) {
            // Her ürünün images alanındaki url'leri signed url'ye çevir
            const productsWithSignedImages = await Promise.all(
              (productsData as any[]).map(async (product: any) => {
                if (product.product_images && product.product_images.length > 0) {
                  const signedImages = await Promise.all(
                    product.product_images.map(async (img: { url: string;[key: string]: any }) => {
                      const signedUrl = await getSignedImageUrlForAny(img.url)
                      return { ...img, url: signedUrl || img.url }
                    }),
                  )
                  return { ...product, product_images: signedImages }
                }
                return product
              }),
            )
            console.log("Çekilen ürünler:", productsWithSignedImages) // DEBUG
            setProducts(productsWithSignedImages)
          }
        }

      } catch (error: any) {
        console.error("Mağaza yüklenirken hata:", error.message || error)
        setStore(null)
      } finally {
        setLoading(false)
      }
    }

    fetchStore()
  }, [slug, router, user])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (store && store.id) {
      fetchProducts(store.id, 1, sortOption, searchQuery)
    }
  }

  const handleSortChange = (value: string) => {
    setSortOption(value)
    if (store && store.id) {
      fetchProducts(store.id, 1, value, searchQuery)
    }
  }

  const handlePageChange = (page: number) => {
    if (store && store.id) {
      fetchProducts(store.id, page, sortOption, searchQuery)
    }
  }

  const handleReviewSubmit = () => {
    // Handle review submission
    console.log("Review submitted:", { rating, comment })
    setShowReviewDialog(false)
  }

  const fetchProducts = async (storeId: string, page = 1, sort = sortOption, search = searchQuery) => {
    try {
      let query = supabase
        .from("products")
        .select(
          `
          id,
          name,
          slug,
          price,
          discount_price,
          rating,
          review_count,
          product_images:product_images(url)
        `,
          { count: "exact" },
        )
        .eq("store_id", storeId as string)
        .eq("is_active", true as boolean)
        .eq("is_approved", true as boolean)

      // Arama sorgusu varsa filtrele
      if (search) {
        query = query.ilike("name", `%${search}%`)
      }

      // Sıralama
      switch (sort) {
        case "price_asc":
          query = query.order("price", { ascending: true })
          break
        case "price_desc":
          query = query.order("price", { ascending: false })
          break
        case "rating":
          query = query.order("rating", { ascending: false })
          break
        case "bestselling":
          query = query.order("sold_count", { ascending: false })
          break
        default:
          query = query.order("created_at", { ascending: false })
      }

      // Sayfalama
      const from = (page - 1) * productsPerPage
      const to = from + productsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        throw new Error(error.message || "Ürünler yüklenirken hata oluştu.")
      }

      if (!data) {
        throw new Error("Ürünler bulunamadı.")
      }

      setProducts(data)
      setCurrentPage(page)
      setTotalPages(count ? Math.ceil(count / productsPerPage) : 1)
    } catch (error: any) {
      console.error("Ürünler yüklenirken hata:", error.message || error)
      toast({
        title: "Hata",
        description: error.message || "Ürünler yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
      setProducts([])
      setTotalPages(1)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Mağaza yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Mağaza Bulunamadı</h1>
          <p className="text-muted-foreground mb-4">Aradığınız mağaza bulunamadı veya kaldırılmış olabilir.</p>
          <Button onClick={() => router.push("/")}>Ana Sayfaya Dön</Button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-16">
        {/* Store Header */}
        <section className="flex flex-col items-center justify-center text-center gap-6">
          <div className="relative w-32 h-32 mx-auto rounded-full border-4 border-orange-100 shadow-lg bg-white overflow-hidden">
            <Image
              src={store.logo_url || "/images/store-logo-placeholder.jpg"}
              alt={store.name || "Store logo"}
              fill
              className="object-cover"
              priority
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight">
            {store.name}
          </h1>
          <div className="flex flex-wrap gap-2 items-center justify-center text-sm font-medium">
            <span className="bg-primary/80 px-2 py-0.5 rounded text-white">
              {store.category?.name || "Kategori Yok"}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {store.city || "Şehir Yok"}
            </span>
            <span className="flex items-center gap-1">
              <Store className="h-4 w-4" />
              {store.owner?.full_name || "Sahip Yok"}
            </span>
          </div>
          {store.description ? (
            <div
              className="mt-2 text-gray-600 dark:text-gray-300 text-base max-w-xl mx-auto line-clamp-2"
              dangerouslySetInnerHTML={{ __html: store.description }}
            />
          ) : (
            <p className="mt-2 text-gray-600 dark:text-gray-300 text-base max-w-xl mx-auto line-clamp-2">
              Açıklama yok.
            </p>
          )}
          <div className="flex gap-3 justify-center mt-2">
            {user && store.owner_id === user.id && (
              <Button
                variant="outline"
                onClick={() => router.push(`/magaza/${store.slug}/duzenle`)}
                className="shadow-md px-6 py-2 text-base font-semibold"
              >
                Mağazayı Düzenle
              </Button>
            )}
          </div>
        </section>

        {/* Store Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="shadow border-none">
            <CardContent className="flex flex-col items-center py-6">
              <Star className="h-6 w-6 text-yellow-400 mb-1" />
              <div className="text-xl font-bold">{store.rating?.toFixed(1) ?? "-"}</div>
              <div className="text-xs text-muted-foreground">Puan</div>
            </CardContent>
          </Card>
          <Card className="shadow border-none">
            <CardContent className="flex flex-col items-center py-6">
              <MessageCircle className="h-6 w-6 text-primary mb-1" />
              <div className="text-xl font-bold">{store.review_count ?? 0}</div>
              <div className="text-xs text-muted-foreground">Değerlendirme</div>
            </CardContent>
          </Card>
          <Card className="shadow border-none">
            <CardContent className="flex flex-col items-center py-6">
              <Package className="h-6 w-6 text-green-600 mb-1" />
              <div className="text-xl font-bold">{products.length ?? 0}</div>
              <div className="text-xs text-muted-foreground">Ürün</div>
            </CardContent>
          </Card>
        </section>

        {/* Store Info & Details */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="shadow border-none">
            <CardContent className="space-y-4 py-6">
              <h2 className="text-lg font-semibold mb-2">Mağaza Bilgileri</h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {store.address || <span className="italic">Belirtilmemiş</span>}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                {store.contact_phone || store.phone || <span className="italic">Belirtilmemiş</span>}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                {store.contact_email || store.email || <span className="italic">Belirtilmemiş</span>}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                {store.website ? (
                  <a
                    href={store.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {store.website}
                  </a>
                ) : (
                  <span className="italic">Belirtilmemiş</span>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow border-none">
            <CardContent className="py-6">
              <h2 className="text-lg font-semibold mb-2">Çalışma Saatleri</h2>
              {store.opening_hours ? (
                <div className="space-y-2">
                  {Object.entries(store.opening_hours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between text-muted-foreground">
                      <span className="font-medium">{day}</span>
                      <span>{hours as string}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">Çalışma saatleri belirtilmemiş</p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Products */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Ürünler</h2>
            {user && store.owner_id === user.id && (
              <Button onClick={() => router.push(`/magaza/${store.slug}/urunler/yeni`)}>Yeni Ürün Ekle</Button>
            )}
          </div>
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className="shadow border-none hover:shadow-lg transition-all h-full flex flex-col"
                >
                  <CardContent className="p-4 flex flex-col flex-1">
                    <div className="aspect-square relative mb-3 rounded-lg overflow-hidden">
                      <Image
                        src={
                          product.product_images?.find?.((img: any) => img.is_primary)?.url ||
                          product.product_images?.[0]?.url ||
                          "/images/product-placeholder.jpg"
                        }
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
                    <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                      {product.description || "Açıklama yok."}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-lg font-bold text-primary">{product.price} TL</div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/urun/${encodeUrlParam(product.slug)}`}>İncele</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Henüz ürün bulunmuyor</p>
            </div>
          )}
        </section>

        {/* Reviews */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Değerlendirmeler</h2>
            {user && <Button onClick={() => setShowReviewDialog(true)}>Değerlendirme Yap</Button>}
          </div>
          {reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.map((review) => (
                <Card key={review.id} className="shadow border-none">
                  <CardContent className="p-6 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {review.user?.full_name?.[0] || "?"}
                        </div>
                        <div>
                          <div className="font-semibold">{review.user?.full_name || "Kullanıcı"}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString("tr-TR")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-4 w-4",
                              i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground",
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 text-muted-foreground text-sm">{review.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Henüz değerlendirme yapılmamış</p>
            </div>
          )}
        </section>

        {/* Review Dialog */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mağaza Değerlendirmesi</DialogTitle>
              <DialogDescription>Mağaza hakkındaki deneyiminizi paylaşın.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Puan</Label>
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((ratingValue) => (
                    <button key={ratingValue} onClick={() => setRating(ratingValue)} className="focus:outline-none">
                      <Star
                        className={cn(
                          "h-6 w-6",
                          ratingValue <= (hoverRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground",
                        )}
                        onMouseEnter={() => setHoverRating(ratingValue)}
                        onMouseLeave={() => setHoverRating(null)}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="comment">Yorum</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Mağaza hakkında ne düşünüyorsunuz?"
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                İptal
              </Button>
              <Button onClick={handleReviewSubmit} disabled={!rating}>
                Gönder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
