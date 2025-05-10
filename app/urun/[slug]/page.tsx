"use client"

import React, { useState, useEffect, useContext } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Store as StoreIcon,
  Clock,
  MapPin,
  Check,
  Loader2,
  Trash,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { CartContext, type CartItem } from "@/providers/cart-provider"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { decodeUrlParam } from "@/lib/utils"
import { getSignedImageUrlForAny } from "@/lib/get-signed-url"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { ProductCard } from "@/app/components/product/ProductCard"
import { Input } from "@/components/ui/input"
import { processProductData, getDiscountPercentage } from "@/lib/product-utils"

interface VariantValue {
  id: string;
  name: string;
}

interface VariantCategory {
  id: string;
  name: string;
  values: VariantValue[];
}

interface ProductImage {
  id: string;
  url: string;
  is_primary: boolean;
}

interface ReviewUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  is_verified_purchase?: boolean;
  user: ReviewUser | null;
}

interface Store {
  id: string;
  name: string | null;
  slug: string | null;
}

interface Brand {
  id: string;
  name: string | null;
  slug: string | null;
  logo_url?: string | null;
}

interface ProductVariant {
  id: string;
  price: number | null;
  discount_price?: number | null;
  is_default: boolean;
  stock_quantity: number | null;
  image_url?: string | null;
  is_active: boolean;
  product_variant_values: Array<{
    variant_values: {
      id: string;
      value: string;
      variant_category: {
        id: string;
        name: string;
      };
    };
  }>;
  name?: string;
  category: ProductCategory | null;
  product_variants: ProductVariant[];
  reviews: Review[];
  images: ProductImage[];
  review_count?: number;
  brand?: Brand | null;
}

interface ProductCategory {
  id: string;
  name: string | null;
  slug: string | null;
}

interface Product {
  id: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  short_description?: string | null;
  price: number | null;
  discount_price?: number | null;
  image_url: string | null;
  has_variants: boolean;
  category_id: string;
  store_id: string;
  is_active: boolean;
  is_approved: boolean;
  sold_count?: number;
  stock_quantity?: number;
  store: Store | null;
  category: ProductCategory | null;
  product_variants: ProductVariant[];
  reviews: Review[];
  images: ProductImage[];
  review_count?: number;
  brand?: Brand | null;
  specifications?: Array<{ name: string; value: string }> | null;
}

interface QuestionAnswer {
  id: string;
  answer_text: string;
  created_at: string;
  user: ReviewUser | null;
}

interface ProductQuestion {
  id: string;
  question_text: string;
  created_at: string;
  is_answered: boolean;
  user: ReviewUser | null;
  answers: QuestionAnswer[];
}

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
  const [product, setProduct] = useState<Product | null>(null)
  const [store, setStore] = useState<Store | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [selectedImage, setSelectedImage] = useState<string>("")
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [addingToCart, setAddingToCart] = useState(false)
  const [reviews, setReviewsState] = useState<Review[]>([])
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [showCartModal, setShowCartModal] = useState(false)
  const [variantCategories, setVariantCategories] = useState<VariantCategory[]>([])
  const [productVariants, setProductVariantsState] = useState<ProductVariant[]>([])
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<ProductQuestion[]>([])
  const [newQuestionText, setNewQuestionText] = useState("")
  const [submittingQuestion, setSubmittingQuestion] = useState(false)
  const [activeTab, setActiveTab] = useState("description")
  const [displayableThumbnails, setDisplayableThumbnails] = useState<Array<{ id: string; signedUrl: string; originalPath: string }>>([])
  const [selectedRating, setSelectedRating] = useState(0)
  const [storeShippingFee, setStoreShippingFee] = useState<number>(0)
  const [displayPrice, setDisplayPrice] = useState<number | null>(null)
  const [displayDiscountPrice, setDisplayDiscountPrice] = useState<number | null>(null)
  const [effectiveOriginalPrice, setEffectiveOriginalPrice] = useState<number | null>(null)

  const fetchRelatedProducts = async (categoryId: string, currentProductId: string) => {
    if (!categoryId) return;
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:categories!category_id (id, name, slug),
          images:product_images(id, url, is_primary)
        `)
        .eq("category_id", categoryId)
        .neq("id", currentProductId) // Exclude the current product
        .eq("is_active", true)
        .eq("is_approved", true)
        .limit(4) // Limit to, for example, 4 related products

      if (error) throw error;

      if (data) {
        const productsWithSignedImages = await Promise.all(
          data.map(async (p: any) => {
            if (p.images && p.images.length > 0) {
              const primaryImage = p.images.find((img: any) => img.is_primary) || p.images[0];
              const signedUrl = await getSignedImageUrlForAny(primaryImage.url);
              return { ...p, image_url: signedUrl || primaryImage.url }; // Use image_url for ProductCard
            }
            return { ...p, image_url: "/placeholder.svg" }; // Fallback if no images
          })
        );
        setRelatedProducts(productsWithSignedImages as Product[]);
      }
    } catch (err) {
      console.error("Error fetching related products:", err);
      setRelatedProducts([]); // Set to empty array on error
    }
  };

  useEffect(() => {
    const fetchProductAndQuestions = async () => {
      setLoading(true)
      setError(null)
      try {
        console.log("Aranan slug:", realSlug)

        const { data: productData, error: productError } = await supabase
          .from("products")
          .select(`
            *,
            store:stores!store_id (id, name, slug),
            category:categories!category_id (id, name, slug),
            brand:brands!brand_id (id, name, slug, logo_url),
            product_variants ( 
              id, price, discount_price, is_default, stock_quantity, is_active, image_url,
              product_variant_values!inner (
                  variant_values:variant_values!value_id ( 
                      id, value, 
                      variant_category:variant_categories!category_id (
                          id, name
                      )
                  )
              )
            ),
            reviews!fk_product ( 
              id, rating, comment, created_at, is_verified_purchase,
              user:profiles!user_id (id, full_name, avatar_url)
            ),
            images:product_images(id, url, is_primary),
            specifications
          `)
          .ilike("slug", realSlug)
          .eq("is_active", true)
          .eq("is_approved", true)
          .maybeSingle<Product>()

        if (productError) {
          console.error("Supabase query error:", productError)
          throw productError
        }
        if (!productData) throw new Error("Ürün bulunamadı.")

        // Process the product data to ensure correct pricing even before variant selection
        const processedProduct = processProductData(productData);

        // Set product state variables
        setProduct(productData)
        setStore(productData.store)
        setReviewsState(productData.reviews || [])

        // Set initial price displays using processed product data
        let initialPrice = processedProduct.discount_price || processedProduct.price;
        setCurrentPrice(initialPrice);
        setDisplayPrice(initialPrice);
        setDisplayDiscountPrice(processedProduct.discount_price);
        setEffectiveOriginalPrice(processedProduct.price);

        if (productData.category_id && productData.id) {
          fetchRelatedProducts(productData.category_id, productData.id);
        }

        // Process images to get signed URLs for thumbnails and set initial selected image
        let initialDisplayImageUrl = "/placeholder.svg";
        if (productData.images && productData.images.length > 0) {
          const signedImagePromises = productData.images.map(async (img) => {
            // Ensure img.url is a string before passing to getSignedImageUrlForAny
            const urlToSign = typeof img.url === 'string' ? img.url : '';
            if (!urlToSign) {
              console.warn(`Image with id ${img.id} has invalid URL, using placeholder.`);
              return { id: img.id, signedUrl: "/placeholder.svg", originalPath: '' };
            }
            const signedUrl = await getSignedImageUrlForAny(urlToSign);
            return { id: img.id, signedUrl: signedUrl || "/placeholder.svg", originalPath: urlToSign };
          });
          const resolvedSignedImages = await Promise.all(signedImagePromises);
          setDisplayableThumbnails(resolvedSignedImages);

          const primaryOriginalImage = productData.images.find(img => img.is_primary);
          const primaryProcessedImage = primaryOriginalImage
            ? resolvedSignedImages.find(pImg => pImg.originalPath === primaryOriginalImage.url)
            : null;

          if (primaryProcessedImage && primaryProcessedImage.signedUrl !== "/placeholder.svg") {
            initialDisplayImageUrl = primaryProcessedImage.signedUrl;
          } else if (resolvedSignedImages.length > 0 && resolvedSignedImages[0].signedUrl !== "/placeholder.svg") {
            initialDisplayImageUrl = resolvedSignedImages[0].signedUrl;
          } else if (productData.image_url) { // Fallback to main product image_url if no suitable product.images
            const signedMainUrl = await getSignedImageUrlForAny(productData.image_url);
            if (signedMainUrl) initialDisplayImageUrl = signedMainUrl;
          }
        } else if (productData.image_url) { // Only main image_url, no product_images array
          const signedMainUrl = await getSignedImageUrlForAny(productData.image_url);
          if (signedMainUrl) initialDisplayImageUrl = signedMainUrl;
          setDisplayableThumbnails([]);
        } else {
          setDisplayableThumbnails([]);
        }
        setSelectedImage(initialDisplayImageUrl);

        let initialVariant: ProductVariant | null = null
        const fetchedVariants = productData.product_variants || []
        setProductVariantsState(fetchedVariants)

        if (productData.has_variants && fetchedVariants.length > 0) {
          const defaultVariant = fetchedVariants.find((v) => v.is_default && v.is_active)
          initialVariant = defaultVariant || fetchedVariants.find((v) => v.is_active) || fetchedVariants[0]

          if (initialVariant && typeof initialVariant.price === 'number') {
            initialPrice = initialVariant.discount_price ?? initialVariant.price
          } else if (typeof productData.price === 'number') {
            initialPrice = productData.discount_price ?? productData.price
          }

          const typesMap = new Map<string, { id: string; name: string; values: Map<string, VariantValue> }>()
          fetchedVariants.forEach((variant) => {
            if (!variant.is_active) return;
            variant.product_variant_values?.forEach((pvv) => {
              const valueInfo = pvv.variant_values
              if (valueInfo && valueInfo.variant_category) {
                const type = valueInfo.variant_category
                const value = { id: valueInfo.id, name: valueInfo.value }
                if (!typesMap.has(type.id)) {
                  typesMap.set(type.id, { id: type.id, name: type.name, values: new Map() })
                }
                if (!typesMap.get(type.id)!.values.has(value.id)) {
                  typesMap.get(type.id)!.values.set(value.id, value)
                }
              }
            })
          })
          const extractedTypes: VariantCategory[] = Array.from(typesMap.values()).map(type => ({
            id: type.id,
            name: type.name,
            values: Array.from(type.values.values()).sort((a, b) => a.name.localeCompare(b.name))
          }))
          setVariantCategories(extractedTypes)

          if (initialVariant?.product_variant_values) {
            const initialOpts: Record<string, string> = {}
            initialVariant.product_variant_values.forEach((pvv) => {
              const valueInfo = pvv.variant_values
              if (valueInfo?.variant_category?.id && valueInfo?.id) {
                initialOpts[valueInfo.variant_category.id] = valueInfo.id
              }
            })
            setSelectedOptions(initialOpts)
          }

        } else if (typeof productData.price === 'number') {
          initialPrice = productData.discount_price ?? productData.price
        }
        setCurrentPrice(initialPrice)
        setSelectedVariant(initialVariant)

        // Fetch Questions & Answers
        try {
          const questionsResponse = await fetch(`/api/products/${productData.id}/questions`)
          if (!questionsResponse.ok) {
            const qError = await questionsResponse.json()
            console.warn("Error fetching questions:", qError.error || questionsResponse.statusText)
            // Don't throw, allow page to render without questions
          } else {
            const questionsData = await questionsResponse.json()
            setQuestions(questionsData || [])
          }
        } catch (qErr: any) {
          console.warn("Failed to fetch questions:", qErr.message)
        }

      } catch (error: any) {
        console.error("Fetch product error details:", error)
        console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)))
        console.error("Error type:", typeof error)
        const errorMessage = error?.message || error?.details || error?.hint || "Ürün verileri yüklenirken tanımlanamayan bir hata oluştu."
        setError(errorMessage)
        toast({ title: "Hata", description: errorMessage, variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    if (realSlug) {
      fetchProductAndQuestions()
    }
  }, [realSlug, toast])

  // Mağazanın kargo ücretini çek
  useEffect(() => {
    const fetchShippingFee = async () => {
      if (!product?.store_id) return;
      const { data, error } = await supabase
        .from("stores")
        .select("shipping_fee")
        .eq("id", product.store_id)
        .maybeSingle();
      if (!error && data) {
        setStoreShippingFee(Number(data.shipping_fee) || 0);
      } else {
        setStoreShippingFee(0);
      }
    };
    if (product?.store_id) fetchShippingFee();
  }, [product?.store_id]);

  const handleVariantSelect = async (typeId: string, valueId: string) => {
    // Create a new copy of the current selections with the new selection
    const newSelections = { ...selectedOptions, [typeId]: valueId };
    setSelectedOptions(newSelections);

    // Find the variant matching the complete selection
    const matchingVariant = findMatchingVariant(newSelections);
    let imagePathToDisplay = selectedImage; // Default to current image

    if (matchingVariant) {
      setSelectedVariant(matchingVariant);

      // Update prices based on the selected variant
      const variantPrice = matchingVariant.price || 0;
      const variantDiscountPrice = matchingVariant.discount_price || null;

      // Set the displayed prices
      setCurrentPrice(variantDiscountPrice !== null ? variantDiscountPrice : variantPrice);
      setDisplayPrice(variantDiscountPrice !== null ? variantDiscountPrice : variantPrice);
      setDisplayDiscountPrice(variantDiscountPrice);
      setEffectiveOriginalPrice(variantPrice);

      // Reset quantity to 1 when changing variants
      setQuantity(1);

      if (matchingVariant.image_url) {
        imagePathToDisplay = matchingVariant.image_url; // Prioritize variant image
      }
    } else {
      // No matching variant found for the combination
      setSelectedVariant(null); // Clear selected variant

      // Reset prices to null/base product price
      setCurrentPrice(product?.has_variants ? null : (product?.discount_price ?? product?.price ?? null));
      setDisplayPrice(product?.has_variants ? null : (product?.discount_price ?? product?.price ?? null));
      setDisplayDiscountPrice(product?.discount_price ?? null);
      setEffectiveOriginalPrice(product?.price ?? null);

      // Reset quantity to 1
      setQuantity(1);

      // Revert to product's default/primary image
      const primaryProductImage = product?.images?.find(img => img.is_primary);
      if (primaryProductImage?.url) {
        imagePathToDisplay = primaryProductImage.url;
      }
    }

    // Update the displayed image based on selection
    if (imagePathToDisplay && imagePathToDisplay !== selectedImage) {
      try {
        // Check if this is a direct URL or a storage path
        if (typeof imagePathToDisplay === 'string' &&
          imagePathToDisplay !== '/placeholder.svg' &&
          !imagePathToDisplay.startsWith('http')) {

          console.log('Attempting to get signed URL for:', imagePathToDisplay);

          // Normalize the path 
          let path = imagePathToDisplay;

          // No need to prepend 'products/' as getSignedImageUrlForAny handles path normalization
          const signedUrl = await getSignedImageUrlForAny(path);

          if (signedUrl) {
            console.log('Successfully obtained signed URL:', signedUrl);
            setSelectedImage(signedUrl);
            return;
          } else {
            console.warn('Failed to get signed URL for variant image:', path);
          }
        }
      } catch (error) {
        console.error('Error getting signed URL for variant image:', error);
      }

      // Fallback - use as-is if not a storage path or if error occurred
      setSelectedImage(imagePathToDisplay);
    }
  };

  const handleQuantityChange = (value: number) => {
    if (value >= 1) {
      setQuantity(value)
    }
  }

  const handleAddToCart = async () => {
    if (!product) return
    if (product.has_variants && !selectedVariant) {
      toast({
        title: "Varyant Seçin",
        description: "Lütfen bir ürün varyantı seçin.",
        variant: "destructive",
      })
      return
    }

    const currentPrice = selectedVariant?.discount_price ?? selectedVariant?.price ?? product.discount_price ?? product.price;
    if (typeof currentPrice !== 'number') {
      toast({ title: "Hata", description: "Ürün fiyatı alınamadı.", variant: "destructive" });
      return;
    }

    // Sepete eklenecek resim için göreceli yolu bul
    let imagePath: string | undefined | null = null;
    if (selectedVariant?.image_url) {
      imagePath = selectedVariant.image_url; // Varyantın kendi resmi varsa onu kullan
    } else if (product.images && product.images.length > 0) {
      const primaryImg = product.images.find(img => img.is_primary);
      imagePath = primaryImg?.url || product.images[0]?.url;
    } else if (product.image_url) {
      imagePath = product.image_url;
    }

    setAddingToCart(true)
    // Satıcıya ödenecek tutar (kuponsuz, komisyonlu) - örnek: komisyon %10
    const commissionRate = 0.10;
    const sellerAmount = currentPrice * (1 - commissionRate);
    // Kullanıcıya gösterilecek toplam (kuponlu, kargo dahil) sepette hesaplanacak
    const itemToAdd = {
      productId: product.id,
      name: product.name || "Ürün",
      price: currentPrice,
      quantity,
      image: imagePath,
      storeId: product.store_id,
      storeName: product.store?.name,
      slug: product.slug,
      storeSlug: product.store?.slug,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      options: selectedVariant ? selectedOptions : undefined,
      sellerAmount, // Satıcıya ödenecek tutar (kuponsuz, komisyonlu)
      shippingFee: storeShippingFee, // Mağazanın kargo ücreti
    }
    addToCart(itemToAdd as Omit<CartItem, "id">)
    setAddingToCart(false)
    setShowCartModal(true)
    toast({
      title: "Başarılı",
      description: "Ürün sepete eklendi.",
      variant: "default",
    })
  }

  const handleStoreClick = (e: React.MouseEvent<HTMLSpanElement>, storeSlug: string | null | undefined) => {
    e.preventDefault()
    e.stopPropagation()
    if (storeSlug) {
      router.push(`/magaza/${storeSlug}`)
    }
  }

  const getProductImage = (prod: any) => {
    if (prod.images && prod.images.length > 0) {
      const primaryImage = prod.images.find((img: ProductImage) => img.is_primary)
      return primaryImage ? primaryImage.url : prod.images[0].url
    }
    return prod.image_url || "/placeholder.svg"
  }

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product || !user || newQuestionText.trim().length < 5) {
      toast({
        title: "Hata",
        description: !user ? "Soru sormak için giriş yapmalısınız." : "Sorunuz en az 5 karakter olmalıdır.",
        variant: "destructive",
      })
      return
    }
    setSubmittingQuestion(true)
    try {
      const response = await fetch(`/api/products/${product.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_text: newQuestionText.trim() }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Soru gönderilemedi.")
      }
      const newQuestionData = await response.json()
      setQuestions((prevQuestions) => [newQuestionData, ...prevQuestions]) // Add to top, assuming new questions need approval
      setNewQuestionText("")
      toast({ title: "Başarılı", description: "Sorunuz gönderildi. Onaylandıktan sonra yayınlanacaktır." })
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" })
    } finally {
      setSubmittingQuestion(false)
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!user) return;
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId).eq("user_id", user.id);
    if (!error) {
      setReviewsState(prev => prev.filter(r => r.id !== reviewId));
      toast({ title: "Yorum silindi", description: "Yorumunuz başarıyla silindi." });
    } else {
      toast({ title: "Hata", description: error.message || "Yorum silinemedi.", variant: "destructive" });
    }
  };

  // Helper function to find a variant that matches the selected options
  const findMatchingVariant = (selectedOpts: Record<string, string>) => {
    return productVariants.find((variant) => {
      if (!variant.is_active) return false;

      // Extract the variant's options
      const variantOptions: Record<string, string> = {};
      variant.product_variant_values?.forEach((pvv) => {
        if (pvv.variant_values?.variant_category?.id && pvv.variant_values?.id) {
          variantOptions[pvv.variant_values.variant_category.id] = pvv.variant_values.id;
        }
      });

      // Check if all selected options match this variant's options
      const allSelectedOptionsMatch = Object.entries(selectedOpts).every(
        ([categoryId, valueId]) => variantOptions[categoryId] === valueId
      );

      // Make sure variant doesn't have extra options not selected by the user
      const noExtraOptions = Object.keys(variantOptions).length === Object.keys(selectedOpts).length;

      return allSelectedOptionsMatch && noExtraOptions;
    });
  };

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

  if (error || !product || !store) {
    return (
      <div className="container py-8 text-center">
        <p className="text-red-500">{error || "Ürün yüklenirken bir sorun oluştu veya ürün bulunamadı."}</p>
        <Button onClick={() => router.push('/')} className="mt-4">Anasayfaya Dön</Button>
      </div>
    )
  }

  const averageRating = reviews.length > 0 ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length : 0
  const reviewCount = reviews.length

  const discountPercentage = (effectiveOriginalPrice && displayPrice !== null && effectiveOriginalPrice > displayPrice)
    ? Math.round(((effectiveOriginalPrice - displayPrice) / effectiveOriginalPrice) * 100)
    : 0
  const isDiscounted = discountPercentage > 0

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6">
      <div className="flex items-center text-sm mb-6">
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          Anasayfa
        </Link>
        <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
        <Link
          href={`/kategori/${product.category?.slug || ""}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {product.category?.name || "Kategori Yok"}
        </Link>
        <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
        <span className="text-foreground font-medium truncate">{product.name || "Ürün Adı Yok"}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-2/5 max-w-[400px] max-h-[400px] mx-auto">
          <div className="relative aspect-square rounded-lg overflow-hidden border mb-4">
            <Image
              src={selectedImage || "/placeholder.svg"}
              alt={product.name || "Ürün Resmi"}
              fill
              className="object-contain w-full h-full"
              priority
              onError={() => setSelectedImage("/placeholder.svg")}
            />
            {isDiscounted && (
              <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-600">%{discountPercentage} İndirim</Badge>
            )}
          </div>

          {displayableThumbnails && displayableThumbnails.length > 0 && (
            <div className="grid grid-cols-5 gap-2 max-w-[400px] mx-auto">
              {displayableThumbnails.map((thumb, idx: number) => (
                <div
                  key={thumb.id || idx}
                  className={`relative aspect-square rounded-md overflow-hidden border cursor-pointer ${selectedImage === thumb.signedUrl ? "ring-2 ring-orange-500" : "hover:ring-2 hover:ring-orange-300"}`}
                  onClick={() => setSelectedImage(thumb.signedUrl)} // Use signedUrl directly
                >
                  <Image
                    src={thumb.signedUrl} // Use signedUrl
                    alt={`${product.name || "Ürün"} küçük resim ${idx + 1}`}
                    fill
                    className="object-cover w-full h-full"
                    onError={(e) => (e.currentTarget.src = "/placeholder.svg")}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-full lg:w-3/5">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-sm text-orange-500 hover:underline cursor-pointer"
              onClick={(e) => handleStoreClick(e, store.slug)}
            >
              {store.name || "Mağaza Adı Yok"}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold mb-2">{product.name || "Ürün Adı Yok"}</h1>

          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-3">
            {product.category && (
              <Link href={`/kategori/${product.category.slug}`} className="hover:underline">
                {product.category.name}
              </Link>
            )}
            {product.category && product.brand && <span className="mx-1">|</span>}
            {product.brand && (
              <Link href={`/marka/${product.brand.slug}`} className="hover:underline font-medium text-indigo-600">
                {product.brand.name}
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="ml-1 font-medium">
                {typeof averageRating === 'number' ? averageRating.toFixed(1) : "0.0"}
              </span>
              <span className="ml-1 text-sm text-muted-foreground">({reviewCount} değerlendirme)</span>
            </div>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-sm text-muted-foreground">{product.sold_count || 0} satıldı</span>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <span className="text-3xl font-bold text-orange-500">
              {typeof displayPrice === 'number' ? displayPrice.toLocaleString("tr-TR") + " ₺" : "Fiyat Sorunuz"}
            </span>
            {displayDiscountPrice !== null && displayDiscountPrice !== undefined && typeof effectiveOriginalPrice === 'number' && effectiveOriginalPrice > (displayPrice || 0) && (
              <span className="text-lg text-muted-foreground line-through">
                {effectiveOriginalPrice.toLocaleString("tr-TR")} ₺
              </span>
            )}
          </div>

          {variantCategories.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Varyant Seçenekleri</h3>
              {variantCategories.map((cat) => (
                <div key={cat.id} className="mb-2">
                  <div className="font-medium mb-1">{cat.name || "Varyant"}</div>
                  <div className="flex flex-wrap gap-2">
                    {cat.values.map((val: VariantValue) => {
                      const currentOptionCatId = cat.id;
                      const currentOptionValId = val.id;

                      const isAvailable = productVariants.some(pv => {
                        if (!pv.is_active) return false;
                        const currentOptionExistsInThisPV = pv.product_variant_values.some((pv_detail: any) =>
                          pv_detail.variant_values.variant_category.id === currentOptionCatId &&
                          pv_detail.variant_values.id === currentOptionValId
                        );

                        if (!currentOptionExistsInThisPV) return false;

                        return Object.entries(selectedOptions).every(([sCatId, sValId]) => {
                          if (sCatId === currentOptionCatId) return true;
                          return pv.product_variant_values.some((pv_detail: any) =>
                            pv_detail.variant_values.variant_category.id === sCatId &&
                            pv_detail.variant_values.id === sValId
                          );
                        });
                      });

                      const isSelected = selectedOptions[cat.id] === val.id;

                      return (
                        <button
                          key={val.id}
                          type="button"
                          onClick={() => isAvailable && handleVariantSelect(cat.id, val.id)}
                          className={`px-3 py-1 rounded border text-sm transition-colors
                          ${isSelected
                              ? "bg-orange-500 text-white border-orange-600 ring-2 ring-orange-300"
                              : isAvailable
                                ? "bg-white text-gray-700 border-gray-300 hover:border-orange-400 hover:text-orange-600"
                                : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-70"
                            }`}
                          disabled={!isAvailable}
                        >
                          {val.name || "Değer"}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

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
                  !selectedVariant || selectedVariant.stock_quantity === null || selectedVariant.stock_quantity === undefined
                    ? true
                    : quantity >= (selectedVariant.stock_quantity)
                }
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="ml-4 text-sm text-muted-foreground">
                {selectedVariant && selectedVariant.stock_quantity !== null && selectedVariant.stock_quantity !== undefined
                  ? `${selectedVariant.stock_quantity} adet stokta`
                  : product.has_variants ? "Varyant seçiniz" : `${product.stock_quantity || 0} adet stokta`}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              size="lg"
              onClick={handleAddToCart}
              disabled={addingToCart || !selectedVariant || !selectedVariant.is_active || selectedVariant.stock_quantity === null || selectedVariant.stock_quantity === undefined || selectedVariant.stock_quantity <= 0}
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

          {product.short_description && (
            <div className="mb-6">
              <p className="text-muted-foreground">{product.short_description || ""}</p>
            </div>
          )}

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

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted">
                    <StoreIcon className="w-full h-full text-muted-foreground p-2" />
                  </div>
                  <div>
                    <span
                      className="font-medium hover:text-orange-500 cursor-pointer"
                      onClick={(e) => handleStoreClick(e, store.slug)}
                    >
                      {store.name || "Mağaza Adı Yok"}
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => store.slug && router.push(`/magaza/${store.slug}`)} disabled={!store.slug}>
                  <StoreIcon className="mr-2 h-4 w-4" />
                  Mağazayı Gör
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="description">Ürün Açıklaması</TabsTrigger>
            <TabsTrigger value="specifications">Teknik Özellikler</TabsTrigger>
            <TabsTrigger value="reviews">Değerlendirmeler ({reviews.length})</TabsTrigger>
            <TabsTrigger value="qa">Sorular ({questions.filter(q => q.is_answered).length})</TabsTrigger>
          </TabsList>
          <TabsContent value="description">
            <Card>
              <CardContent className="prose max-w-none pt-6">
                {product.description ? (
                  <div dangerouslySetInnerHTML={{ __html: product.description }} />
                ) : (
                  <p>Bu ürün için henüz bir açıklama girilmemiş.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="specifications">
            <Card>
              <CardHeader>
                <CardTitle>Ürün Özellikleri</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {product.specifications && product.specifications.length > 0 ? (
                  <dl className="divide-y divide-gray-200">
                    {product.specifications.map((spec, index) => (
                      spec.name && spec.value && (
                        <div key={index} className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                          <dt className="text-sm font-medium text-gray-500">{spec.name}</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{spec.value}</dd>
                        </div>
                      )
                    ))}
                  </dl>
                ) : (
                  <p className="text-gray-500">Bu ürün için henüz özellik girilmemiş.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="reviews">
            <div className="flex flex-col gap-6">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="border-b pb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{review.user?.full_name || "Kullanıcı"}</div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("tr-TR")}
                        {user && review.user?.id === user.id && (
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteReview(review.id)} title="Yorumu Sil">
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">{review.comment || "Yorum yok."}</p>
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
          <TabsContent value="qa">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-6">Müşteri Soru ve Cevapları</h3>

                {user && (
                  <form onSubmit={handleQuestionSubmit} className="mb-8">
                    <Label htmlFor="new-question" className="block text-sm font-medium text-gray-700 mb-1">Bir sorunuz mu var?</Label>
                    <Textarea
                      id="new-question"
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      placeholder="Bu ürün hakkında bir soru sorun..."
                      rows={3}
                      className="mb-2"
                      disabled={submittingQuestion}
                    />
                    <Button type="submit" disabled={submittingQuestion || newQuestionText.trim().length < 5}>
                      {submittingQuestion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Soru Gönder
                    </Button>
                  </form>
                )}
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

                {/* Questions List - Assuming this is where the actual questions would be listed. Currently missing, but structure is for the form and general info. */}
                {questions.length > 0 ? (
                  <div className="space-y-6 mt-8">
                    {questions.filter(q => q.is_answered || q.user?.id === user?.id).map(question => (
                      <div key={question.id} className="border-t pt-6">
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-gray-800">
                            <MessageCircle className="inline h-4 w-4 mr-1.5 text-gray-500" />
                            {question.question_text}
                          </p>
                          <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(question.created_at).toLocaleDateString("tr-TR")}</span>
                        </div>
                        {question.user && <p className="text-xs text-gray-500 ml-6 mb-1">Soran: {question.user.full_name || "Kullanıcı"}</p>}
                        {question.is_answered && question.answers && question.answers.length > 0 ? (
                          question.answers.map(answer => (
                            <div key={answer.id} className="mt-2 pl-6 border-l-2 border-orange-200 ml-3 py-2 bg-orange-50/50 rounded-r-md">
                              <div className="flex justify-between items-start">
                                <p className="text-sm text-gray-700">
                                  <StoreIcon className="inline h-4 w-4 mr-1.5 text-orange-500" />
                                  {answer.answer_text}
                                </p>
                                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{new Date(answer.created_at).toLocaleDateString("tr-TR")}</span>
                              </div>
                              {answer.user && <p className="text-xs text-gray-500 ml-6">Cevaplayan: {answer.user.full_name || "Satıcı"}</p>}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 ml-6 mt-2">Bu soru henüz cevaplanmadı.</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 mt-6">
                    <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h4 className="text-md font-medium mb-1">Henüz Soru Sorulmamış</h4>
                    <p className="text-sm text-muted-foreground">Bu ürün hakkında ilk soruyu siz sorun!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Related Products Section */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold mb-6 text-center">Benzer Ürünler</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct as any} />
            ))}
          </div>
        </section>
      )}

      <Dialog open={showCartModal} onOpenChange={setShowCartModal}>
        <DialogContent className="flex flex-col items-center gap-4 p-6">
          <Truck className="h-12 w-12 text-orange-500" />
          <DialogTitle className="text-xl font-semibold">Ürün Sepete Eklendi!</DialogTitle>
          <div className="flex flex-col gap-2 w-full">
            <Button onClick={() => { router.push("/sepet"); setShowCartModal(false); }} className="w-full">Sepete Git</Button>
            <Button variant="outline" onClick={() => setShowCartModal(false)} className="w-full">Alışverişe Devam Et</Button>
          </div>
        </DialogContent>
      </Dialog>

      {user && product && (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const form = e.target as HTMLFormElement
            const commentInput = form.elements.namedItem("comment") as HTMLTextAreaElement;
            const comment = commentInput.value.trim();
            const rating = selectedRating;

            if (!comment || rating === 0) {
              toast({ title: "Eksik Bilgi", description: "Lütfen yorumunuzu yazın ve puan seçin.", variant: "destructive" });
              return;
            }
            if (!product?.id || !user?.id) {
              toast({ title: "Hata", description: "Kullanıcı veya ürün bilgisi bulunamadı.", variant: "destructive" });
              return;
            }

            const supabaseUser = user as any;

            const { error: reviewError } = await supabase.from("reviews").insert({
              product_id: product.id,
              user_id: supabaseUser.id,
              comment,
              rating,
              is_approved: true,
            })
            if (!reviewError) {
              toast({ title: "Yorum gönderildi!", description: "Yorumunuz onaylandıktan sonra yayınlanacaktır." })
              const newReview: Review = {
                id: `temp-${Date.now()}`,
                comment,
                rating,
                created_at: new Date().toISOString(),
                user: {
                  id: supabaseUser.id,
                  full_name: supabaseUser.user_metadata?.full_name || "Siz",
                  avatar_url: supabaseUser.user_metadata?.avatar_url || null
                },
              };
              setReviewsState(prevReviews => [newReview, ...prevReviews]);
              form.reset();
              setSelectedRating(0);
            } else {
              console.error("Review submission error:", reviewError);
              toast({ title: "Hata", description: reviewError.message || "Yorum gönderilemedi.", variant: "destructive" })
            }
          }}
          className="mb-6 border p-4 rounded-lg shadow-sm bg-card mt-10"
        >
          <h4 className="text-lg font-semibold mb-3">Bu Ürünü Değerlendirin</h4>
          <div className="mb-3">
            <span className="text-sm font-medium text-muted-foreground block mb-1">Puanınız:</span>
            <div className="flex gap-1 items-center star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => setSelectedRating(star)}
                  style={{ cursor: "pointer" }}
                >
                  <Star
                    className="h-6 w-6"
                    fill={star <= selectedRating ? "#FFD700" : "#E5E7EB"}
                    color={star <= selectedRating ? "#FFD700" : "#E5E7EB"}
                  />
                </span>
              ))}
            </div>
            <input type="hidden" name="rating" value={selectedRating} required />
          </div>
          <textarea
            name="comment"
            className="w-full border rounded p-2 mb-3 min-h-[80px] focus:ring-orange-500 focus:border-orange-500 transition-shadow"
            rows={3}
            placeholder="Yorumunuzu buraya yazın..."
            required
          />
          <Button type="submit" className="w-full sm:w-auto">Yorumu Gönder</Button>
        </form>
      )}

      {product && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-md flex items-center justify-between px-4 py-3 md:hidden">
          <div>
            <div className="font-medium text-sm line-clamp-1">{product.name || "Ürün Adı"}</div>
            <div className="font-bold text-orange-500">
              {typeof displayPrice === 'number' ? displayPrice.toLocaleString("tr-TR") + " ₺" : "Fiyat Sorunuz"}
            </div>
          </div>
          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleAddToCart}
            disabled={addingToCart || !selectedVariant || !selectedVariant.is_active || selectedVariant.stock_quantity === null || selectedVariant.stock_quantity === undefined || selectedVariant.stock_quantity <= 0}
          >
            <ShoppingCart className="mr-1 h-4 w-4" />
            {addingToCart ? "Ekleniyor..." : "Sepete Ekle"}
          </Button>
        </div>
      )}
    </div>
  )
}
