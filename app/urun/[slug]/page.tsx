"use client"

import React, { useState, useEffect, useContext } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import {
  Star,
  Truck,
  ShieldCheck,
  CreditCard,
  Heart,
  Share2,
  MessageCircle,
  ChevronRight,
  Plus,
  Minus,
  ShoppingCart,
  Store,
  Clock,
  MapPin,
  Check,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { CartContext } from "@/providers/cart-provider"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { ProductCardImage } from "@/components/ProductCardImage"
import { decodeUrlParam } from "@/lib/utils"

const supabase = createClientComponentClient()

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  let realSlug = slug
  try {
    realSlug = decodeUrlParam(slug)
  } catch (e) {
    realSlug = slug
  }
  const router = useRouter()
  const { toast } = useToast()
  const { addToCart } = useContext(CartContext)
  const { user } = useAuth()
  const [product, setProduct] = useState<any>(null)
  const [store, setStore] = useState<any>(null)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [selectedImage, setSelectedImage] = useState<string>("")
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [addingToCart, setAddingToCart] = useState(false)
  const [reviews, setReviews] = useState<any[]>([])
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [showCartModal, setShowCartModal] = useState(false)
  const [variantCategories, setVariantCategories] = useState<any[]>([])
  const [variantValues, setVariantValues] = useState<any[]>([])
  const [productVariants, setProductVariants] = useState<any[]>([])
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      try {
        console.log("Aranan slug:", realSlug) // Debug için

        // Önce ürünü bul
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("*")
          .ilike("slug", realSlug)
          .eq("is_active", true)
          .eq("is_approved", true)
          .single()

        console.log("Ürün sorgusu sonucu:", { productData, productError }) // Debug için

        if (productError) {
          console.error("Ürün sorgusu hatası:", productError)
          // ID ile dene
          if (realSlug && !isNaN(Number.parseInt(realSlug))) {
            const { data: productById, error: idError } = await supabase
              .from("products")
              .select("*")
              .eq("id", realSlug)
              .eq("is_active", true)
              .eq("is_approved", true)
              .single()

            if (idError) {
              console.error("ID ile ürün arama hatası:", idError)
              toast({
                title: "Hata",
                description: "Ürün bulunamadı.",
                variant: "destructive",
              })
              return
            }

            if (productById) {
              // Eğer slug farklıysa yönlendir
              if (productById.slug && productById.slug !== realSlug) {
                router.replace(`/urun/${productById.slug}`)
                return
              }
              setProduct(productById)

              // Mağaza bilgilerini getir
              const { data: storeData } = await supabase
                .from("stores")
                .select("*")
                .eq("id", productById.store_id)
                .single()

              setStore(storeData)
            } else {
              toast({
                title: "Hata",
                description: "Ürün bulunamadı.",
                variant: "destructive",
              })
              return
            }
          } else {
            toast({
              title: "Hata",
              description: "Ürün bulunamadı.",
              variant: "destructive",
            })
            return
          }
        }

        if (!productData) {
          toast({
            title: "Hata",
            description: "Ürün bulunamadı.",
            variant: "destructive",
          })
          return
        }

        setProduct(productData)

        // Mağaza bilgilerini getir
        const { data: storeData } = await supabase.from("stores").select("*").eq("id", productData.store_id).single()

        setStore(storeData)

        // Kategori bilgilerini getir
        const { data: categoryData } = await supabase
          .from("categories")
          .select("*")
          .eq("id", productData.category_id)
          .single()

        // Ürün resimlerini getir
        const { data: imagesData } = await supabase.from("product_images").select("*").eq("product_id", productData.id)

        // Ürün bilgilerini güncelle
        setProduct((prev: any) => ({
          ...prev,
          category: categoryData,
          images: imagesData,
        }))

        // Varyant kategorileri ve değerleri
        console.log("Varyant kategorileri sorgulanıyor...")
        try {
          // First, parse the combo field from the first variant to get category types
          const { data: variantsData, error: variantsError } = await supabase
            .from("product_variants")
            .select("*")
            .eq("product_id", productData.id)

          console.log("Varyant verileri sonucu:", { variantsData, variantsError })

          if (variantsError) {
            console.error("Varyant verileri hatası:", variantsError)
            setProductVariants([])
          } else if (variantsData && variantsData.length > 0) {
            // Extract variant categories from the combo field of the first variant
            let variantCategoriesFromCombo = []
            try {
              const firstVariantCombo =
                typeof variantsData[0].combo === "string" ? JSON.parse(variantsData[0].combo) : variantsData[0].combo

              // Get unique category types from combo
              variantCategoriesFromCombo = firstVariantCombo.map((item) => ({
                category_id: item.typeId,
                name: item.typeName,
              }))

              // Remove duplicates
              variantCategoriesFromCombo = variantCategoriesFromCombo.filter(
                (cat, index, self) => index === self.findIndex((c) => c.category_id === cat.category_id),
              )

              console.log("Varyant kategorileri combo'dan:", variantCategoriesFromCombo)
              setVariantCategories(variantCategoriesFromCombo)

              // Extract all possible values for each category from all variants
              const allVariantValues = []

              for (const variant of variantsData) {
                const comboData = typeof variant.combo === "string" ? JSON.parse(variant.combo) : variant.combo

                for (const item of comboData) {
                  allVariantValues.push({
                    id: item.valueId,
                    category_id: item.typeId,
                    value: item.value,
                  })
                }
              }

              // Remove duplicates
              const uniqueVariantValues = allVariantValues.filter(
                (val, index, self) => index === self.findIndex((v) => v.id === val.id),
              )

              console.log("Benzersiz varyant değerleri:", uniqueVariantValues)
              setVariantValues(uniqueVariantValues)

              // Process variants with their values
              const variantsWithDetails = variantsData.map((variant) => {
                let valueIds = []
                let valueObjects = []

                if (variant.combo) {
                  try {
                    const comboArr = typeof variant.combo === "string" ? JSON.parse(variant.combo) : variant.combo

                    valueIds = comboArr.map((c) => c.valueId)
                    valueObjects = comboArr
                  } catch (e) {
                    console.error("Combo parse hatası:", e)
                    valueIds = []
                    valueObjects = []
                  }
                }

                return {
                  ...variant,
                  value_ids: valueIds,
                  value_objects: valueObjects,
                  images: [], // Will be populated if variant images exist
                }
              })

              console.log("İşlenmiş varyantlar:", variantsWithDetails)
              setProductVariants(variantsWithDetails)

              // Set product with variants
              setProduct((prev) => ({
                ...prev,
                variants: variantsWithDetails,
              }))

              // Initialize selected options with first value of each category
              const initialOptions = {}
              for (const cat of variantCategoriesFromCombo) {
                const valuesForCategory = uniqueVariantValues.filter((v) => v.category_id === cat.category_id)
                if (valuesForCategory.length > 0) {
                  initialOptions[cat.category_id] = valuesForCategory[0].id
                }
              }

              console.log("Başlangıç seçili varyant değerleri:", initialOptions)
              setSelectedOptions(initialOptions)
            } catch (e) {
              console.error("Combo alanı işleme hatası:", e)
              setVariantCategories([])
              setVariantValues([])
            }
          } else {
            setProductVariants([])
          }
        } catch (error) {
          console.error("Varyant işlemleri sırasında hata:", error)
          setVariantCategories([])
          setVariantValues([])
          setProductVariants([])
        }

        // İlk resmi seç
        if (imagesData && imagesData.length > 0) {
          const primaryImage = imagesData.find((img: any) => img.is_primary)
          setSelectedImage(primaryImage ? primaryImage.url : imagesData[0].url)
        }

        // Ürün değerlendirmelerini getir
        const { data: reviewsData } = await supabase
          .from("product_reviews")
          .select(`
            *,
            user:user_id(id, email, full_name)
          `)
          .eq("product_id", productData.id)
          .eq("is_approved", true)
          .order("created_at", { ascending: false })
          .limit(5)

        setReviews(reviewsData || [])

        // İlgili ürünleri getir
        const { data: relatedData } = await supabase
          .from("products")
          .select(`
            id,
            name,
            slug,
            price,
            discount_price,
            rating,
            review_count,
            has_variants,
            store:store_id(id, name, slug),
            images:product_images(url, is_primary)
          `)
          .eq("category_id", productData.category_id)
          .neq("id", productData.id)
          .eq("is_active", true)
          .eq("is_approved", true)
          .limit(5)

        setRelatedProducts(relatedData || [])

        // Görüntülenme sayısını artır
        await supabase.rpc("increment_product_view", { product_id: productData.id })
      } catch (error) {
        console.error("Ürün yüklenirken hata:", error)
        toast({
          title: "Hata",
          description: "Ürün bilgileri yüklenirken bir hata oluştu.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [realSlug, router, toast])

  // Seçili kombinasyona uygun varyantı bul
  useEffect(() => {
    if (!productVariants.length || !variantCategories.length) return

    // Get all selected value IDs
    const selectedValueIds = Object.values(selectedOptions)

    // Find a variant that matches all selected options
    const found = productVariants.find((variant) => {
      // Check if all selected values are in this variant
      return (
        selectedValueIds.every((valueId) => variant.value_ids.includes(valueId)) &&
        // And check if the variant has exactly the same number of values as selected options
        variant.value_ids.length === Object.keys(selectedOptions).length
      )
    })

    console.log("Seçilen varyant:", found)
    setSelectedVariant(found || null)
  }, [selectedOptions, productVariants, variantCategories])

  // Seçili varyant değiştiğinde resmi güncelle
  useEffect(() => {
    if (selectedVariant && selectedVariant.images && selectedVariant.images.length > 0) {
      // Varyant resmi varsa onu göster
      const primaryImage = selectedVariant.images.find((img: any) => img.is_primary)
      setSelectedImage(primaryImage ? primaryImage.url : selectedVariant.images[0].url)
    } else if (product && product.images && product.images.length > 0) {
      // Varyant resmi yoksa ürün resmini göster
      const primaryImage = product.images.find((img: any) => img.is_primary)
      setSelectedImage(primaryImage ? primaryImage.url : product.images[0].url)
    }
  }, [selectedVariant, product])

  const handleVariantSelect = (categoryId: string, valueId: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [categoryId]: valueId,
    }))
  }

  const handleQuantityChange = (value: number) => {
    if (value >= 1) {
      setQuantity(value)
    }
  }

  const handleAddToCart = async () => {
    if (!product) return
    setAddingToCart(true)
    try {
      const price = selectedVariant
        ? selectedVariant.discount_price || selectedVariant.price
        : product.discount_price || product.price
      await addToCart({
        productId: product.id,
        slug: product.slug,
        variantId: selectedVariant?.id,
        variantName: selectedVariant?.name,
        quantity,
        price,
        name: product.name,
        image: selectedImage || "/placeholder.svg",
        storeName: store.name,
        storeId: store.id,
        storeSlug: store.slug,
      })
      setShowCartModal(true)
      toast({
        title: "Başarılı",
        description: "Ürün sepete eklendi.",
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Hata",
        description: "Ürün sepete eklenirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setAddingToCart(false)
    }
  }

  const handleStoreClick = (e: React.MouseEvent<HTMLSpanElement>, slug: string) => {
    e.preventDefault()
    e.stopPropagation()
    router.push(`/magaza/${slug}`)
  }

  const getProductImage = (product: any) => {
    if (product.images && product.images.length > 0) {
      const primaryImage = product.images.find((img: any) => img.is_primary)
      return primaryImage ? primaryImage.url : product.images[0].url
    }
    return "/placeholder.svg"
  }

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2 animate-pulse">
            <div className="aspect-square bg-muted rounded-lg"></div>
          </div>
          <div className="w-full md:w-1/2 space-y-4 animate-pulse">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-6 bg-muted rounded w-1/2"></div>
            <div className="h-10 bg-muted rounded w-1/3"></div>
            <div className="h-24 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded w-full"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) return null

  const currentPrice = selectedVariant
    ? selectedVariant.discount_price || selectedVariant.price
    : product.discount_price || product.price

  const originalPrice = selectedVariant
    ? selectedVariant.discount_price
      ? selectedVariant.price
      : null
    : product.discount_price
      ? product.price
      : null

  const discountPercentage = originalPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0

  const isDiscounted = !!originalPrice

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm mb-6">
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          Anasayfa
        </Link>
        <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
        <Link
          href={`/kategori/${product.category?.slug || ""}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {product.category?.name || ""}
        </Link>
        <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
        <span className="text-foreground font-medium truncate">{product.name || ""}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Ürün Görselleri */}
        <div className="w-full lg:w-2/5 max-w-[400px] max-h-[400px] mx-auto">
          <div className="relative aspect-square rounded-lg overflow-hidden border mb-4">
            <ProductCardImage
              product={product}
              selectedVariant={selectedVariant}
              className="object-contain w-full h-full"
            />
            {isDiscounted && (
              <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-600">%{discountPercentage} İndirim</Badge>
            )}
          </div>

          {/* Küçük Resimler */}
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-5 gap-2 max-w-[400px] mx-auto">
              {product.images.map((image: any, idx: number) => (
                <div
                  key={image.id || idx}
                  className={`relative aspect-square rounded-md overflow-hidden border cursor-pointer ${selectedImage === image.url ? "ring-2 ring-orange-500" : ""}`}
                  onClick={() => setSelectedImage(image.url)}
                >
                  <ProductCardImage
                    product={{ ...product, images: [image], image_url: image.url }}
                    className="object-cover w-full h-full"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ürün Bilgileri */}
        <div className="w-full lg:w-3/5">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-sm text-orange-500 hover:underline cursor-pointer"
              onClick={() => router.push(`/magaza/${store.slug}`)}
            >
              {store.name || ""}
            </span>
            {store.is_verified && (
              <Badge variant="outline" className="h-5 text-xs border-blue-500 text-blue-500">
                Resmi
              </Badge>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold mb-2">{product.name || ""}</h1>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="ml-1 font-medium">{product.rating.toFixed(1)}</span>
              <span className="ml-1 text-sm text-muted-foreground">({product.review_count} değerlendirme)</span>
            </div>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-sm text-muted-foreground">{product.sold_count} satıldı</span>
          </div>

          {/* Fiyat */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-3xl font-bold text-orange-500">
              {selectedVariant
                ? (selectedVariant.discount_price || selectedVariant.price).toLocaleString("tr-TR")
                : product.discount_price || product.price}{" "}
              ₺
            </span>
            {selectedVariant && selectedVariant.discount_price && (
              <span className="text-lg text-muted-foreground line-through">
                {selectedVariant.price.toLocaleString("tr-TR")} ₺
              </span>
            )}
          </div>

          {/* Varyantlar - Geliştirilmiş */}
          {variantCategories.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Varyant Seçenekleri</h3>
              {variantCategories.map((cat, index) => {
                // Get values for this category
                const valuesForCategory = variantValues.filter((val) => val.category_id === cat.category_id)

                return (
                  <div key={cat.category_id || index} className="mb-2">
                    <div className="font-medium mb-1">{cat.name || ""}</div>
                    <div className="flex flex-wrap gap-2">
                      {valuesForCategory.map((val, valIndex) => {
                        // Check if this value is available with current selections
                        const testOptions = { ...selectedOptions }
                        testOptions[cat.category_id] = val.id

                        // Find if there's a variant with this combination
                        const isAvailable = productVariants.some((variant) => {
                          const selectedIds = Object.entries(testOptions).map(([catId, valId]) => valId)
                          return selectedIds.every((id) => variant.value_ids.includes(id))
                        })

                        return (
                          <button
                            key={val.id || valIndex}
                            type="button"
                            onClick={() => isAvailable && handleVariantSelect(cat.category_id, val.id)}
                            className={`px-3 py-1 rounded border
                    ${
                      selectedOptions[cat.category_id] === val.id
                        ? "bg-orange-500 text-white border-orange-500"
                        : !isAvailable
                          ? "bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-800 border-gray-300"
                    }
                    hover:bg-orange-100 transition`}
                            disabled={!isAvailable}
                          >
                            {val.value || ""}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Miktar */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">Adet</h3>
            <div className="flex items-center">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={
                  !selectedVariant
                    ? true
                    : quantity >= (selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity)
                }
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="ml-4 text-sm text-muted-foreground">
                {selectedVariant ? selectedVariant.stock_quantity : "Varyant seçiniz"} adet stokta
              </span>
            </div>
          </div>

          {/* Aksiyonlar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              size="lg"
              onClick={handleAddToCart}
              disabled={addingToCart || !selectedVariant || selectedVariant.stock_quantity <= 0}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {addingToCart ? "Ekleniyor..." : "Sepete Ekle"}
            </Button>
            <Button variant="outline" size="lg">
              <Heart className="mr-2 h-5 w-5" />
              Favorilere Ekle
            </Button>
            <Button variant="outline" size="icon" className="hidden sm:flex">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>

          {/* Kısa Açıklama */}
          {product.short_description && (
            <div className="mb-6">
              <p className="text-muted-foreground">{product.short_description || ""}</p>
            </div>
          )}

          {/* Özellikler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-orange-500" />
              <span className="text-sm">Hızlı Teslimat</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-orange-500" />
              <span className="text-sm">Güvenli Alışveriş</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-500" />
              <span className="text-sm">Taksit İmkanı</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-orange-500" />
              <span className="text-sm">Orijinal Ürün Garantisi</span>
            </div>
          </div>

          {/* Mağaza Bilgileri */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted">
                    <Image
                      src={store.logo_url || "/placeholder.svg"}
                      alt={store.name || ""}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <span
                      className="font-medium hover:text-orange-500 cursor-pointer"
                      onClick={() => router.push(`/magaza/${store.slug}`)}
                    >
                      {store.name || ""}
                    </span>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                      <span>{store.rating.toFixed(1)}</span>
                      <span className="mx-1">•</span>
                      <span>{store.review_count} değerlendirme</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push(`/magaza/${store.slug}`)}>
                  <Store className="mr-2 h-4 w-4" />
                  Mağazayı Gör
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span>{store.city || "İstanbul"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span>{store.working_hours || "09:00 - 18:00"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ürün Detayları Tabs */}
      <div className="mt-10">
        <Tabs defaultValue="description">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="description">Ürün Açıklaması</TabsTrigger>
            <TabsTrigger value="variants">Varyant Detayları</TabsTrigger>
            <TabsTrigger value="reviews">Değerlendirmeler ({product.review_count})</TabsTrigger>
            <TabsTrigger value="shipping">Kargo ve İade</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-6">
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: product.description || "" }} />
          </TabsContent>
          <TabsContent value="variants" className="mt-6">
            {product.has_variants && productVariants.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2 text-left">Varyant</th>
                      <th className="p-2 text-left">Fiyat</th>
                      <th className="p-2 text-left">İndirimli Fiyat</th>
                      <th className="p-2 text-left">Stok</th>
                      <th className="p-2 text-left">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productVariants.map((variant: any, index: number) => (
                      <tr key={variant.id || index} className="border-b">
                        <td className="p-2">{variant?.name || ""}</td>
                        <td className="p-2">{variant?.price?.toLocaleString("tr-TR") || ""} ₺</td>
                        <td className="p-2">
                          {variant?.discount_price ? `${variant.discount_price.toLocaleString("tr-TR")} ₺` : "-"}
                        </td>
                        <td className="p-2">{variant?.stock_quantity || 0}</td>
                        <td className="p-2">
                          {variant?.stock_quantity > 0 ? (
                            <Badge className="bg-green-500">Stokta</Badge>
                          ) : (
                            <Badge variant="destructive">Tükendi</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Bu ürün için varyant bulunmamaktadır.</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="reviews" className="mt-6">
            <div className="flex flex-col gap-6">
              {reviews.length > 0 ? (
                reviews.map((review, index: number) => (
                  <div key={review.id || index} className="border-b pb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{review.user.full_name || "Kullanıcı"}</div>
                        {review.is_verified_purchase && (
                          <Badge variant="outline" className="text-xs border-green-500 text-green-500">
                            Onaylı Alışveriş
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("tr-TR")}
                      </div>
                    </div>
                    <div className="flex items-center mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm">{review.comment || ""}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Henüz değerlendirme yok</h3>
                  <p className="text-muted-foreground">Bu ürün için ilk değerlendirmeyi siz yapın.</p>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="shipping" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <img src="/kargo-yurtiçi.png" alt="Yurtiçi Kargo" className="h-8" />
                <span className="font-medium">Yurtiçi Kargo</span>
                <span className="text-sm text-muted-foreground">Tahmini Teslimat: 1-3 gün</span>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">Kargo Bilgileri</h3>
                <p className="text-muted-foreground">
                  Siparişiniz, ödeme onayından sonra 24 saat içinde kargoya verilir. Kargo takip numarası, ürün kargoya
                  verildiğinde size SMS ve e-posta yoluyla iletilecektir.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">İade Koşulları</h3>
                <p className="text-muted-foreground">
                  Ürünü teslim aldıktan sonra 14 gün içerisinde iade edebilirsiniz. İade etmek istediğiniz ürünün
                  kullanılmamış, denenmemiş ve orijinal ambalajında olması gerekmektedir.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Benzer Ürünler */}
      {relatedProducts.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Benzer Ürünler</h2>
            <Link href={`/kategori/${product.category.slug}`}>
              <Button variant="link" className="text-orange-500">
                Tümünü Gör
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {relatedProducts.map((relatedProduct, index) => (
              <Link key={relatedProduct.id || index} href={`/urun/${relatedProduct?.slug || ""}`}>
                <Card className="h-full overflow-hidden transition-all hover:shadow-md">
                  <CardContent className="p-0">
                    <div className="relative aspect-square">
                      <Image
                        src={getProductImage(relatedProduct) || "/placeholder.svg"}
                        alt={relatedProduct?.name || ""}
                        fill
                        className="object-cover"
                      />
                      {relatedProduct.discount_price && (
                        <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-600">
                          %
                          {Math.round(
                            (((relatedProduct?.price || 0) - (relatedProduct?.discount_price || 0)) /
                              (relatedProduct?.price || 1)) *
                              100,
                          )}{" "}
                          İndirim
                        </Badge>
                      )}
                      {relatedProduct.has_variants && (
                        <Badge className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600">Varyantlı</Badge>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="text-sm text-muted-foreground mb-1">
                        <span
                          className="hover:underline cursor-pointer"
                          onClick={(e) => handleStoreClick(e, relatedProduct?.store?.slug || "")}
                        >
                          {relatedProduct?.store?.name || ""}
                        </span>
                      </div>
                      <h3 className="font-medium leading-tight mb-1 line-clamp-2">{relatedProduct?.name || ""}</h3>
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{relatedProduct?.rating?.toFixed(1) || ""}</span>
                        <span className="text-xs text-muted-foreground">({relatedProduct?.review_count || 0})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {relatedProduct?.discount_price ? (
                          <>
                            <span className="font-bold">
                              {relatedProduct?.discount_price?.toLocaleString("tr-TR") || ""} ₺
                            </span>
                            <span className="text-sm text-muted-foreground line-through">
                              {relatedProduct?.price?.toLocaleString("tr-TR") || ""} ₺
                            </span>
                          </>
                        ) : (
                          <span className="font-bold">{relatedProduct?.price?.toLocaleString("tr-TR") || ""} ₺</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sepete ekle modalı */}
      <Dialog open={showCartModal} onOpenChange={setShowCartModal}>
        <DialogContent className="flex flex-col items-center gap-4">
          <Truck className="h-10 w-10 text-orange-500" />
          <DialogTitle>Ürün Sepete Eklendi!</DialogTitle>
          <Button onClick={() => router.push("/sepet")}>Sepete Git</Button>
          <Button variant="outline" onClick={() => setShowCartModal(false)}>
            Alışverişe Devam Et
          </Button>
        </DialogContent>
      </Dialog>

      {/* Yorum ekleme formu (sadece giriş yapanlar için) */}
      {user && (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const form = e.target as HTMLFormElement
            const comment = (form.elements.namedItem("comment") as HTMLInputElement).value
            const rating = Number((form.elements.namedItem("rating") as HTMLInputElement).value)
            if (!comment || !rating) return
            const { error } = await supabase.from("product_reviews").insert({
              product_id: product.id,
              user_id: user.id,
              comment,
              rating,
              is_approved: false,
            })
            if (!error) {
              toast({ title: "Yorum gönderildi!", description: "Yorumunuz onaylandıktan sonra yayınlanacaktır." })
              setReviews([
                { user: { full_name: user.fullName }, comment, rating, created_at: new Date().toISOString() },
                ...reviews,
              ])
              form.reset()
            } else {
              toast({ title: "Hata", description: "Yorum gönderilemedi.", variant: "destructive" })
            }
          }}
          className="mb-6 border p-4 rounded"
        >
          <h4 className="font-medium mb-2">Yorum Yap</h4>
          <div className="flex gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <label key={star}>
                <input type="radio" name="rating" value={star} className="hidden" required />
                <Star className="h-5 w-5 cursor-pointer" fill="#fbbf24" />
              </label>
            ))}
          </div>
          <textarea
            name="comment"
            className="w-full border rounded p-2 mb-2"
            rows={3}
            placeholder="Yorumunuz..."
            required
          />
          <Button type="submit">Gönder</Button>
        </form>
      )}

      {/* Sticky ürün başlığı ve fiyatı (mobilde) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-md flex items-center justify-between px-4 py-2 md:hidden">
        <div>
          <div className="font-medium text-sm line-clamp-1">{product.name || ""}</div>
          <div className="font-bold text-orange-500">{currentPrice.toLocaleString("tr-TR")} ₺</div>
        </div>
        <Button
          size="sm"
          className="bg-orange-500 hover:bg-orange-600"
          onClick={handleAddToCart}
          disabled={addingToCart}
        >
          <ShoppingCart className="mr-1 h-4 w-4" />
          {addingToCart ? "Ekleniyor..." : "Sepete Ekle"}
        </Button>
      </div>
    </div>
  )
}
