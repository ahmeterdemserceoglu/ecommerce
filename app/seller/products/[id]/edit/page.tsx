"use client"
import type React from "react"
import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm, FormProvider, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import SellerSidebar from "@/components/seller/seller-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Trash, ImageIcon, Loader2, Plus, X, SparklesIcon } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"
import dynamic from 'next/dynamic';
import CreatableSelect from 'react-select/creatable';
import { slugify } from "@/lib/utils";

const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor'), {
  ssr: false,
  loading: () => <div style={{ minHeight: '200px', border: '1px solid #ccc', padding: '10px', borderRadius: 'var(--radius)' }}>Yükleniyor...</div>
});

interface BrandOption {
  label: string;
  value: string;
  __isNew__?: boolean;
}

const productSchema = z.object({
  name: z.string().min(3, { message: "Ürün adı en az 3 karakter olmalıdır" }),
  price: z.coerce.number().positive({ message: "Fiyat pozitif bir değer olmalıdır" })
    .or(z.literal(0).transform(() => 0)), // Allow 0 for variant products
  store_id: z.string().uuid({ message: "Mağaza seçin" }),
  category_id: z.string().uuid({ message: "Kategori seçin" }),
  brand_id: z.string().uuid({ message: "Marka seçin" }).optional().nullable(),
  description: z.string().optional(),
  short_description: z.string().optional(),
  discount_price: z.coerce.number().positive().optional().nullable(),
  stock_quantity: z.coerce.number().int().nonnegative().optional(),
  is_active: z.boolean(),
  has_variants: z.boolean(),
  specifications: z.array(z.object({ name: z.string().min(1), value: z.string().min(1) })).optional(),
})

const supabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function getSignedImageUrl(path: string): Promise<string | null> {
  try {
    // Clean up the path to ensure it's in the right format
    let cleanPath = path;

    // Remove 'images/' prefix if it exists (since we're already using images bucket)
    if (cleanPath.startsWith('images/')) {
      cleanPath = cleanPath.substring(7);
    }

    const { data, error } = await supabaseClient.storage.from("images").createSignedUrl(cleanPath, 60 * 60 * 24 * 365 * 100) // 100 yıl
    if (error) {
      console.error("Signed URL alınırken hata:", error)
      return null
    }
    return data?.signedUrl || null
  } catch (error) {
    console.error("getSignedImageUrl error:", error);
    return null;
  }
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<any[]>([])
  const [brands, setBrands] = useState<BrandOption[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [myStore, setMyStore] = useState<any>(null)
  const [images, setImages] = useState<any[]>([])
  const [variants, setVariants] = useState<any[]>([])
  const [hasVariants, setHasVariants] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [productStatus, setProductStatus] = useState<any>(null)
  const [formDefault, setFormDefault] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("basic")
  const [productSpecs, setProductSpecs] = useState([{ name: "", value: "" }])
  const formRef = useRef<HTMLFormElement>(null)
  const [variantCategories, setVariantCategories] = useState<any[]>([])
  const [selectedCategories, setSelectedCategories] = useState<any[]>([])
  const [combinations, setCombinations] = useState<any[]>([])
  const [pendingImages, setPendingImages] = useState<File[]>([])
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  const methods = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: formDefault || {
      name: "",
      price: 0,
      store_id: "",
      category_id: "",
      brand_id: null,
      description: "",
      short_description: "",
      discount_price: null,
      stock_quantity: 0,
      is_active: true,
      has_variants: false,
      specifications: [],
    },
    mode: "onChange",
  })

  const { control, watch, setValue, ...restMethods } = methods;

  // Ürün ve varyant verilerini çek
  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      try {
        const productId = typeof params.id === "string" ? params.id : undefined
        if (!productId) throw new Error("Geçersiz ürün ID")
        // Ürün
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId as string)
          .single()
        if (productError || !product || typeof product !== "object" || !("has_variants" in product))
          throw new Error(productError?.message || "Ürün bulunamadı")
        setFormDefault(product)
        setHasVariants((product as any).has_variants)
        // Populate specifications if they exist
        if ((product as any).specifications && Array.isArray((product as any).specifications)) {
          setProductSpecs((product as any).specifications.length > 0 ? (product as any).specifications : [{ name: "", value: "" }])
        } else {
          setProductSpecs([{ name: "", value: "" }])
        }
        methods.reset(product)
        // Varyantlar ve kombinasyonlar
        if ((product as any).has_variants && (product as any).id) {
          const { data: variantData, error: variantQueryError } = await supabase
            .from("product_variants")
            .select("*, product_variant_values(value_id, value:variant_values(id, value))")
            .eq("product_id", (product as any).id as string)

          if (variantQueryError) {
            console.error("Error fetching variants:", variantQueryError);
            setVariants([]);
            setCombinations([]);
          } else if (variantData) {
            setVariants(variantData || [])
            // Ensure signed URLs are fetched for existing variant images
            const combinationsWithImages = await Promise.all(
              (variantData || []).map(async (variant: any) => {
                let signedImageUrl = null;
                if (variant.image_url) {
                  // Assuming image_url stores a path like "variant_images/image.jpg"
                  // And getSignedImageUrl expects the path within the bucket.
                  // Adjust if getSignedImageUrl handles full paths or different structures.
                  try {
                    signedImageUrl = await getSignedImageUrl(variant.image_url);
                  } catch (e) { console.error("Error signing variant image URL:", e); }
                }
                return {
                  id: variant.id,
                  values: (variant.product_variant_values || []).map((vv: any) => ({
                    id: vv.value?.id,
                    value: vv.value?.value,
                  })),
                  price: variant.price,
                  stock_quantity: variant.stock_quantity,
                  is_default: variant.is_default,
                  is_active: variant.is_active,
                  sku: variant.sku || "",
                  image_url: signedImageUrl, // Store the signed URL for display
                  original_image_path: variant.image_url, // Store original path for updates/deletions
                  pendingImageFile: null, // For new uploads
                  pendingImagePreview: null, // For new upload previews
                }
              })
            );
            setCombinations(combinationsWithImages);
          } else {
            setVariants([]);
            setCombinations([]);
          }
        } else {
          setCombinations([])
        }
        // Görseller
        if ((product as any).id) {
          const { data: imageData, error: imageError } = await supabase
            .from("product_images")
            .select("id, url, is_primary")
            .eq("product_id", (product as any).id as string)
          if (imageError) console.error("Error fetching product images:", imageError);
          else setImages(imageData || [])
        }
        // Kategoriler
        const { data: categoriesData } = await supabase
          .from("categories")
          .select("id, name")
          .eq("is_active", true as any)
          .order("name")
        setCategories(categoriesData || [])

        // Fetch brands using the new API endpoint
        try {
          const response = await fetch('/api/brands')
          if (!response.ok) {
            const errorData = await response.json()
            console.error("Error fetching brands from API:", errorData);
            throw new Error(errorData.error || 'Failed to fetch brands')
          }
          const brandsData = await response.json()
          // Map to BrandOption format
          setBrands(brandsData.map((brand: any) => ({ label: brand.name, value: brand.id })) || [])
        } catch (brandsError: any) {
          console.warn("Error fetching brands via API:", brandsError)
          // Optionally show a toast error to the user
          toast({
            title: "Marka Yükleme Hatası",
            description: brandsError.message || "Markalar yüklenirken bir sorun oluştu.",
            variant: "destructive",
          })
          setBrands([]) // Set to empty array on error
        }

        // Mağazalar
        const { data: storesData } = await supabase
          .from("stores")
          .select("id, name")
          .eq("is_active", true as any)
        setStores(storesData || [])
        setMyStore(storesData?.find((s: any) => (product as any).id && s.id === (product as any).store_id) || null)
        // Onay/reddetme durumu
        setProductStatus({ is_approved: (product as any).is_approved, reject_reason: (product as any).reject_reason })
      } catch (e: any) {
        setError(e.message || "Veriler yüklenirken hata oluştu.")
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
    // eslint-disable-next-line
  }, [params.id])

  // Kategorileri ve değerleri Supabase'den çek - sadece bu ürüne ait olanları
  useEffect(() => {
    async function fetchVariantCategories() {
      if (!params.id) return;

      // Fetch only variant categories associated with this product
      const { data: cats } = await supabase
        .from("variant_categories")
        .select("id, name")
        .eq("product_id", params.id);

      if (cats && cats.length > 0) {
        // Her kategori için değerleri çek
        const catsWithValues = await Promise.all(
          cats.map(async (cat: any) => {
            const { data: vals } = await supabase
              .from("variant_values")
              .select("id, value")
              .eq("category_id", cat.id);
            return { ...cat, values: vals || [] };
          })
        );
        setVariantCategories(catsWithValues);
      }
    }

    if (params.id) {
      fetchVariantCategories();
    }
  }, [params.id]);

  // Dosya seçildiğinde sadece pendingImages'e ekle
  const handlePendingImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    setPendingImages(Array.from(e.target.files))
  }

  // Yükle butonuna basınca yükleme işlemini başlat
  const handleUploadPendingImages = async () => {
    if (pendingImages.length === 0) return
    try {
      const uploadedImages = []
      for (const file of pendingImages) {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast({ title: "Hata", description: "Sadece resim dosyaları yüklenebilir.", variant: "destructive" })
          continue
        }
        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          toast({ title: "Hata", description: "Dosya boyutu 5MB'dan küçük olmalıdır.", variant: "destructive" })
          continue
        }
        // Generate unique filename
        const fileExt = file.name.split(".").pop()
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        const filePath = `products/${fileName}`
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage.from("images").upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        })
        if (uploadError) {
          console.error("Storage upload error:", uploadError)
          toast({
            title: "Hata",
            description: `Dosya yüklenirken hata oluştu: ${uploadError.message}`,
            variant: "destructive",
          })
          continue
        }
        // Get public URL
        const { data: publicUrlData } = supabase.storage.from("images").getPublicUrl(filePath)
        const publicUrl = publicUrlData?.publicUrl
        console.log("filePath:", filePath)
        console.log("publicUrl:", publicUrl)
        if (!publicUrl) {
          toast({ title: "Hata", description: "Görselin public URL'i alınamadı.", variant: "destructive" })
          // Dosya yüklendiyse sil
          await supabase.storage.from("images").remove([filePath])
          continue
        }
        // Add to product_images table
        const { error: dbError, data: insertedImageData } = await supabase
          .from("product_images")
          .insert({
            product_id: params.id as string,
            url: filePath,
            is_primary: images.length === 0 && uploadedImages.length === 0,
            alt_text: file.name,
          })
          .select("id, url, is_primary, alt_text")
          .single()
        if (dbError) {
          await supabase.storage.from("images").remove([filePath])
          toast({
            title: "Hata",
            description: `Veritabanına kayıt eklenirken hata oluştu: ${dbError.message}`,
            variant: "destructive",
          })
          continue
        }
        if (insertedImageData) {
          uploadedImages.push({
            id: insertedImageData.id,
            url: publicUrl,
            is_primary: insertedImageData.is_primary,
            alt_text: insertedImageData.alt_text,
          })
        } else {
          console.warn("Image inserted to DB but no data returned, filePath:", filePath);
        }
      }
      // Update local state with new images
      if (uploadedImages.length > 0) {
        const updatedImages = [...images, ...uploadedImages]
        setImages(updatedImages)
        setPendingImages([])
        // Update product's image_url if this is the first image and it's primary
        if (images.length === 0 && uploadedImages[0].is_primary && uploadedImages[0].url) {
          await supabase.from("products").update({ image_url: uploadedImages[0].url.startsWith('http') ? uploadedImages[0].url : filePath.substring(filePath.indexOf('/') + 1) }).eq("id", params.id as string)
        }
        toast({ title: "Başarılı", description: "Görseller başarıyla yüklendi." })
      }
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Görsel yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveImage = async (id: string) => {
    try {
      // Delete from database
      const { error } = await supabase.from("product_images").delete().eq("id", id as string)

      if (error) throw error

      // Update local state
      setImages((prev) => prev.filter((img) => img.id !== id))

      toast({
        title: "Başarılı",
        description: "Görsel başarıyla silindi.",
      })
    } catch (error: any) {
      console.error("Delete error:", error)
      toast({
        title: "Hata",
        description: error.message || "Görsel silinirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleSetPrimary = async (id: string) => {
    try {
      // Update all images to not primary
      const { error: updateError } = await supabase
        .from("product_images")
        .update({ is_primary: false } as any)
        .eq("product_id", params.id as string)

      if (updateError) throw updateError

      // Set selected image as primary
      const { error: setPrimaryError } = await supabase.from("product_images").update({ is_primary: true } as any).eq("id", id as string)

      if (setPrimaryError) throw setPrimaryError

      // Update local state
      setImages((prev) =>
        prev.map((img) => ({
          ...img,
          is_primary: img.id === id,
        })),
      )

      toast({
        title: "Başarılı",
        description: "Ana görsel güncellendi.",
      })
    } catch (error: any) {
      console.error("Set primary error:", error)
      toast({
        title: "Hata",
        description: error.message || "Ana görsel güncellenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  // Form submit
  const onSubmit = async (data: any) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const productId = typeof params.id === "string" ? params.id : undefined
      if (!productId) throw new Error("Geçersiz ürün ID")

      // Find the default variant's price to use as the product price if variants are enabled
      let productPrice = data.price;
      let productDiscountPrice = data.discount_price;

      if (data.has_variants && combinations.length > 0) {
        // Find the default variant
        const defaultVariant = combinations.find(combo => combo.is_default);
        if (defaultVariant) {
          // Use the default variant's price for the product price
          productPrice = defaultVariant.price || 0;
          productDiscountPrice = defaultVariant.discount_price || null;
        } else if (combinations.length > 0) {
          // If no default is marked, use the first variant's price
          productPrice = combinations[0].price || 0;
          productDiscountPrice = combinations[0].discount_price || null;
        }
      }

      // Ürün güncelle
      await supabase
        .from("products")
        .update({
          ...data,
          price: productPrice, // Use the calculated price
          discount_price: productDiscountPrice, // Use the calculated discount price
          specifications: productSpecs.filter(spec => spec.name.trim() !== "" && spec.value.trim() !== ""),
          updated_at: new Date().toISOString()
        })
        .eq("id", String(productId) as string)
      // Varyant kombinasyonlarını güncelle
      if (data.has_variants) {
        // 1. Var olan kombinasyon id'lerini topla
        const { data: existingVariantData, error: existingVariantError } = await supabase.from("product_variants").select("id, image_url").eq("product_id", productId as string)
        if (existingVariantError) throw existingVariantError;
        const existingDbVariants = existingVariantData || [];
        const existingDbVariantMap = new Map(existingDbVariants.map(v => [v.id, v]));

        // 2. Yeni/Güncellenmiş kombinasyonların id'lerini topla (form state)
        const formCombinationIds = combinations.filter((c) => c.id).map((c) => c.id)

        // 3. Silinenleri bul ve DB'den sil (ve storage'dan resimlerini)
        const variantsToDelete = existingDbVariants.filter(dbVar => !formCombinationIds.includes(dbVar.id));
        for (const variantToDelete of variantsToDelete) {
          if (variantToDelete.image_url) {
            // Attempt to delete from storage, ignore error if file not found
            await supabase.storage.from("images").remove([variantToDelete.image_url]);
          }
          await supabase.from("product_variants").delete().eq("id", variantToDelete.id);
          // Also delete from product_variant_images if used
          await supabase.from("product_variant_images").delete().eq("variant_id", variantToDelete.id);
        }

        // 4. Güncelle/ekle
        for (const combo of combinations) {
          let newImagePath: string | null = combo.original_image_path || null; // Start with existing path

          // Handle image upload if a new file is pending
          if (combo.pendingImageFile) {
            const file = combo.pendingImageFile;
            const fileExt = file.name.split('.').pop();
            // Store in products folder for consistency
            const newFileName = `products/${productId}_variant_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

            // Upload the new image
            const { error: uploadError } = await supabase.storage
              .from("images")
              .upload(newFileName, file, { cacheControl: "3600", upsert: false });

            if (uploadError) {
              console.error("Error uploading new variant image:", uploadError);
              toast({
                title: "Varyant Resmi Yükleme Hatası",
                description: uploadError.message,
                variant: "destructive"
              });
            } else {
              // Delete the old image if it exists
              if (combo.original_image_path) {
                try {
                  await supabase.storage.from("images").remove([combo.original_image_path]);
                } catch (deleteError) {
                  console.error("Error deleting old variant image:", deleteError);
                }
              }

              // Set the new image path for the database
              newImagePath = newFileName;

              console.log("Successfully uploaded variant image:", newFileName);
            }
          } else if (combo.original_image_path && !combo.image_url && !combo.pendingImagePreview) {
            // Image was explicitly removed
            try {
              await supabase.storage.from("images").remove([combo.original_image_path]);
              console.log("Successfully removed variant image:", combo.original_image_path);
            } catch (deleteError) {
              console.error("Error removing variant image:", deleteError);
            }
            newImagePath = null;
          }

          if (combo.id) {
            // Güncelle (Update existing variant)
            const updatePayload: any = {
              price: combo.price,
              stock_quantity: combo.stock_quantity,
              is_default: combo.is_default,
              is_active: combo.is_active,
              name: combo.values.map((v: any) => v.value).join(" - "),
              sku: combo.sku || null,
              discount_price: combo.discount_price === undefined || combo.discount_price === '' ? null : combo.discount_price,
              discount_percent: combo.discount_percent === undefined || combo.discount_percent === '' ? null : combo.discount_percent,
            };
            if (newImagePath !== combo.original_image_path) { // Only update image_url if it changed
              updatePayload.image_url = newImagePath;
            }
            await supabase
              .from("product_variants")
              .update(updatePayload)
              .eq("id", combo.id)
          } else {
            // Ekle (Insert new variant)
            const { data: inserted, error: insertVariantError } = await supabase
              .from("product_variants")
              .insert({
                product_id: productId,
                price: combo.price,
                stock_quantity: combo.stock_quantity,
                is_default: combo.is_default,
                is_active: combo.is_active,
                name: combo.values.map((v: any) => v.value).join(" - "),
                sku: combo.sku || null,
                image_url: newImagePath, // Set image path for new variant
                discount_price: combo.discount_price === undefined || combo.discount_price === '' ? null : combo.discount_price,
                discount_percent: combo.discount_percent === undefined || combo.discount_percent === '' ? null : combo.discount_percent,
              } as any)
              .select("id")
              .single()

            if (insertVariantError) throw insertVariantError;
            if (inserted && inserted.id) {
              // Link variant values (product_variant_values table)
              for (const v of combo.values) {
                await supabase.from("product_variant_values").insert({
                  variant_id: inserted.id, // This should be product_variant_id if table schema is so
                  value_id: v.id,
                } as any)
              }
            } else {
              console.warn("Failed to insert variant or retrieve ID for combo:", combo);
            }
          }
        }
      }
      setSuccess("Ürün başarıyla güncellendi!")
      setTimeout(() => router.push("/seller/products"), 1500)
    } catch (e: any) {
      setError(e.message || "Bir hata oluştu.")
    } finally {
      setLoading(false)
    }
  }

  // Kombinasyonları oluşturmak için kartesyen çarpım fonksiyonu
  function cartesian(arr: any[][]) {
    return arr.reduce((a, b) => a.flatMap((d) => b.map((e) => [...d, e])), [[]])
  }

  // Kombinasyonları oluştur
  function handleCreateCombinations() {
    // Seçili kategoriler ve değerler
    const selected = variantCategories
      .map((cat) => {
        const sel = selectedCategories.find((c: any) => c.category_id === cat.id)
        return sel && sel.values.length > 0 ? cat.values.filter((v: any) => sel.values.includes(v.id)) : null
      })
      .filter(Boolean)

    // Her kategoriden en az bir seçenek seçilmiş mi kontrol et
    const hasEmptyCategory = selectedCategories.some((cat: any) => cat.values.length === 0)
    if (hasEmptyCategory) {
      toast({
        title: "Hata",
        description: "Her kategoriden en az bir seçenek seçmelisiniz.",
        variant: "destructive",
      })
      return
    }

    if (selected.length === 0) return
    const combos = cartesian(selected as any)

    // Tekrar kontrolü - Düzeltilmiş kontrol mantığı
    const existingCombos = combinations.map((c) =>
      c.values
        .map((v: any) => v.id)
        .sort()
        .join("-"),
    )

    const newCombos = combos.filter((combo: any) => {
      const comboKey = combo
        .map((v: any) => v.id)
        .sort()
        .join("-")
      return !existingCombos.includes(comboKey)
    })

    if (newCombos.length === 0) {
      toast({
        title: "Hata",
        description: "Bu kombinasyon(lar) zaten mevcut! Lütfen farklı kombinasyonlar seçin.",
        variant: "destructive",
      })
      return
    }

    // Yeni kombinasyonları ekle
    setCombinations([
      ...combinations,
      ...newCombos.map((combo: any) => ({
        values: combo,
        price: 0,
        stock_quantity: 0,
        sku: "",
        is_active: true,
        is_default: false,
        discount_percent: 0,
        discount_price: 0,
        image: "",
      })),
    ])

    // Başarılı mesajı göster
    toast({
      title: "Başarılı",
      description: `${newCombos.length} yeni kombinasyon eklendi.`,
    })
  }

  // Kombinasyon tablo satırı güncelleme
  function updateCombination(idx: number, data: any) {
    setCombinations((prev) => prev.map((c, i) => (i === idx ? { ...c, ...data } : c)))
  }
  function removeCombination(idx: number) {
    setCombinations((prev) => prev.filter((_, i) => i !== idx))
  }
  function setDefaultCombination(idx: number) {
    setCombinations((prev) => prev.map((c, i) => ({ ...c, is_default: i === idx })))
  }

  // --- Variant Image Helper Functions ---
  const handleVariantImageSelect = async (file: File, combinationIndex: number) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Hata", description: "Sadece resim dosyaları yüklenebilir.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB limit for variant images
      toast({ title: "Hata", description: "Varyant resmi boyutu 2MB'dan küçük olmalıdır.", variant: "destructive" });
      return;
    }

    try {
      // Generate a local preview URL for UI display
      const preview = URL.createObjectURL(file);

      setCombinations(prev => prev.map((combo, idx) =>
        idx === combinationIndex
          ? {
            ...combo,
            pendingImageFile: file,
            pendingImagePreview: preview,
            // Keep original_image_path for reference when saving
          }
          : combo
      ));
    } catch (error) {
      console.error("Error handling variant image select:", error);
      toast({ title: "Hata", description: "Resim önizlemesi oluşturulurken bir hata oluştu.", variant: "destructive" });
    }
  };

  const handleRemoveVariantImage = (combinationIndex: number) => {
    setCombinations(prev => prev.map((combo, idx) =>
      idx === combinationIndex
        ? { ...combo, image_url: null, original_image_path: null, pendingImageFile: null, pendingImagePreview: null }
        : combo
    ));
    // Note: Actual deletion from storage and DB will happen on form submit
  };

  // --- Specification Helper Functions ---
  const handleSpecChange = (index: number, field: 'name' | 'value', fieldValue: string) => {
    const newSpecs = [...productSpecs];
    newSpecs[index][field] = fieldValue;
    setProductSpecs(newSpecs.filter(spec => spec.name.trim() !== "" && spec.value.trim() !== ""));
    methods.setValue('specifications', newSpecs.filter(spec => spec.name.trim() !== "" && spec.value.trim() !== ""));
  };

  const addSpecField = () => {
    setProductSpecs([...productSpecs, { name: "", value: "" }]);
  };

  const removeSpecField = (index: number) => {
    const newSpecs = productSpecs.filter((_, i) => i !== index);
    setProductSpecs(newSpecs.length > 0 ? newSpecs : [{ name: "", value: "" }]); // Ensure at least one empty field if all removed
    methods.setValue('specifications', newSpecs.filter(spec => spec.name.trim() !== "" && spec.value.trim() !== ""));
  };

  const handleCreateBrand = async (inputValue: string): Promise<BrandOption | null> => {
    setIsCreatingBrand(true);
    try {
      const slug = slugify(inputValue); // Use the imported slugify
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inputValue, slug: slug }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Yeni marka oluşturulamadı.');
      }
      const newBrand = await response.json();
      const newBrandOption = { label: newBrand.name, value: newBrand.id };
      setBrands((prev) => [...prev, newBrandOption]);
      if (methods && methods.setValue) {
        methods.setValue('brand_id', newBrand.id, { shouldValidate: true });
      }
      toast({ title: "Başarılı", description: `'${newBrand.name}' markası oluşturuldu.` });
      return newBrandOption;
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setIsCreatingBrand(false);
    }
  };

  const handleGenerateAIDescription = async () => {
    setIsGeneratingDescription(true);
    const productName = methods.getValues("name");
    const productCategory = categories.find(cat => cat.id === methods.getValues("category_id"))?.name;
    const shortDesc = methods.getValues("short_description");

    if (!productName) {
      toast({ title: "Eksik Bilgi", description: "Yapay zeka için en azından bir ürün adı girin.", variant: "warning" });
      setIsGeneratingDescription(false);
      return;
    }

    let prompt = `Aşağıdaki bilgilerle bir e-ticaret sitesi için çekici ve detaylı bir ürün açıklaması yaz (HTML formatında paragraflar halinde):
    Ürün Adı: ${productName}`;
    if (productCategory) prompt += `\nKategori: ${productCategory}`;
    if (shortDesc) prompt += `\nKısa Açıklama: ${shortDesc}`;
    prompt += `\n\nÖzellikleri vurgula, faydalarını anlat ve müşteriyi satın almaya teşvik et. Uzunluk ideal olarak 3-5 paragraf olmalı.`

    toast({ title: "Yapay Zeka Çalışıyor", description: "Açıklama oluşturuluyor, lütfen bekleyin...", duration: 5000 });

    try {
      // !!! --- IMPORTANT: REPLACE WITH YOUR ACTUAL AI API CALL --- !!!
      // Placeholder - replace with your AI integration
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate API delay
      const aiGeneratedText = `<p><b>${productName}</b> (Düzenlenmiş) - ${productCategory || 'Bu harika ürün'}, kullanıcılarına benzersiz bir deneyim sunuyor. ${shortDesc ? shortDesc + '. ' : ''}</p><p>Bu düzenlenmiş ürün açıklaması, en son yenilikleri ve geliştirilmiş özellikleri içermektedir. Kalitesi ve performansıyla öne çıkar.</p><p>Şimdi <b>${productName}</b> ile farkı yaşayın!</p>`;
      // --- End of Placeholder ---

      if (aiGeneratedText) {
        methods.setValue("description", aiGeneratedText, { shouldValidate: true, shouldDirty: true });
        toast({ title: "Başarılı", description: "Yapay zeka açıklaması oluşturuldu ve alana eklendi." });
      } else {
        throw new Error("Yapay zeka boş bir açıklama üretti.");
      }
    } catch (error: any) {
      console.error("AI Description Error:", error);
      toast({ title: "Yapay Zeka Hatası", description: error.message, variant: "destructive" });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p>Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SellerSidebar />
      <main className="flex-1 py-8">
        <div className="container max-w-2xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Temel Bilgiler</CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Hata</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert variant="default" className="mb-4">
                  <AlertTitle>Başarılı</AlertTitle>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
              {productStatus && (
                <div className="mb-4">
                  {productStatus.is_approved === true && (
                    <span className="text-green-600 font-semibold">Onaylandı</span>
                  )}
                  {productStatus.is_approved === false && productStatus.reject_reason && (
                    <span className="text-red-600 font-semibold">Reddedildi: {productStatus.reject_reason}</span>
                  )}
                  {productStatus.is_approved === null && (
                    <span className="text-yellow-600 font-semibold">Onay Bekliyor</span>
                  )}
                </div>
              )}
              <FormProvider {...methods}>
                <form ref={formRef} onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
                  {/* Temel Bilgiler Alanı */}
                  <div className="grid grid-cols-1 gap-6">
                    <Input {...methods.register("name")} placeholder="Ürün Adı" required />
                    {!hasVariants && (
                      <>
                        <Input {...methods.register("price")} placeholder="Fiyat" type="number" required min={0} />
                        <Input {...methods.register("discount_price")} placeholder="İndirimli Fiyat" type="number" min={0} />
                      </>
                    )}
                    <Select
                      value={methods.watch("category_id")}
                      onValueChange={(v) => methods.setValue("category_id", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div>
                      <label htmlFor="brand_id" className="block text-sm font-medium text-gray-700">
                        Marka
                      </label>
                      <Controller
                        name="brand_id"
                        control={control}
                        render={({ field }) => (
                          <CreatableSelect
                            isClearable
                            isDisabled={isCreatingBrand || loading}
                            isLoading={isCreatingBrand}
                            onChange={(selectedOption) => {
                              field.onChange(selectedOption ? selectedOption.value : null);
                            }}
                            onCreateOption={async (inputValue) => {
                              const newOption = await handleCreateBrand(inputValue);
                              if (newOption) {
                                field.onChange(newOption.value);
                              }
                            }}
                            options={brands}
                            value={brands.find(b => b.value === field.value) || null}
                            placeholder="Marka seçin veya yeni oluşturun..."
                            formatCreateLabel={(inputValue) => `"${inputValue}" markasını oluştur`}
                            styles={{
                              control: (base) => ({
                                ...base,
                                borderColor: methods.formState.errors.brand_id ? '#ef4444' : '#e5e7eb',
                                boxShadow: methods.formState.errors.brand_id ? '0 0 0 1px #ef4444' : base.boxShadow,
                                '&:hover': {
                                  borderColor: methods.formState.errors.brand_id ? '#ef4444' : '#d1d5db',
                                },
                              }),
                            }}
                            classNamePrefix="react-select"
                          />
                        )}
                      />
                      {methods.formState.errors.brand_id && <p className="text-red-500 text-xs mt-1">{methods.formState.errors.brand_id?.message?.toString()}</p>}
                    </div>
                    {myStore ? (
                      <div>
                        <label className="block text-sm font-medium mb-1">Mağaza</label>
                        <Input value={myStore.name} disabled readOnly />
                        <input type="hidden" {...methods.register("store_id")} value={myStore.id} />
                      </div>
                    ) : (
                      <Select value={methods.watch("store_id")} onValueChange={(v) => methods.setValue("store_id", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Mağaza seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.map((store: any) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Textarea {...methods.register("short_description")} placeholder="Kısa Açıklama" />
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                          Detaylı Açıklama
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateAIDescription}
                          disabled={isGeneratingDescription}
                        >
                          {isGeneratingDescription ?
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
                            <SparklesIcon className="mr-2 h-4 w-4" />
                          }
                          Yapay Zeka ile Oluştur
                        </Button>
                      </div>
                      <RichTextEditor
                        value={methods.watch("description") || ""}
                        onChange={(value) => methods.setValue("description", value === '<p><br></p>' ? '' : value, { shouldValidate: true, shouldDirty: true })}
                        placeholder="Ürününüzü detaylı bir şekilde açıklayın..."
                        className="bg-white dark:bg-gray-700 rounded-md shadow-sm min-h-[250px]"
                      />
                      {methods.formState.errors.description && <p className="text-red-500 text-xs mt-1">{methods.formState.errors.description?.message?.toString()}</p>}
                    </div>

                    <Card className="mt-8">
                      <CardHeader>
                        <CardTitle className="text-md">Ürün Özellikleri</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {productSpecs.map((spec, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-5">
                                <Input
                                  placeholder="Özellik Adı (örn: Renk)"
                                  value={spec.name}
                                  onChange={(e) => handleSpecChange(index, 'name', e.target.value)}
                                />
                              </div>
                              <div className="col-span-5">
                                <Input
                                  placeholder="Değer (örn: Kırmızı)"
                                  value={spec.value}
                                  onChange={(e) => handleSpecChange(index, 'value', e.target.value)}
                                />
                              </div>
                              <div className="col-span-2 flex justify-end">
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeSpecField(index)} disabled={productSpecs.length <= 1 && index === 0 && spec.name === "" && spec.value === ""}>
                                  <Trash className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addSpecField} className="mt-2">
                          <Plus className="mr-2 h-4 w-4" /> Özellik Ekle
                        </Button>
                      </CardContent>
                    </Card>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={methods.watch("is_active")}
                          onCheckedChange={(v) => methods.setValue("is_active", v)}
                        />
                        <span>Aktif Ürün</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={methods.watch("has_variants")}
                          onCheckedChange={(v) => {
                            setHasVariants(v)
                            methods.setValue("has_variants", v)
                            if (v) {
                              // When enabling variants, reset price fields
                              methods.setValue("price", 0)
                              methods.setValue("discount_price", null)
                              methods.setValue("stock_quantity", 0)
                            }
                          }}
                        />
                        <span>Varyantlı Ürün</span>
                      </div>
                    </div>
                    {!hasVariants && (
                      <Input {...methods.register("stock_quantity")} placeholder="Stok" type="number" min={0} />
                    )}
                  </div>
                  {/* Varyantlar Alanı */}
                  <div>
                    <h2 className="text-lg font-semibold mb-4 mt-8">Varyantlar</h2>
                    <Card className="mb-4">
                      <CardHeader>
                        <CardTitle>Varyant Kategorileri</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {variantCategories.map((cat) => (
                            <div key={cat.id}>
                              <div className="font-semibold mb-1">{cat.name}</div>
                              <div className="flex flex-wrap gap-2">
                                {cat.values.map((val: any) => (
                                  <Button
                                    key={val.id}
                                    type="button"
                                    variant={
                                      selectedCategories.find(
                                        (c: any) => c.category_id === cat.id && c.values.includes(val.id),
                                      )
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCategories((prev) => {
                                        const found = prev.find((c: any) => c.category_id === cat.id)
                                        if (found) {
                                          // Toggle value
                                          const values = found.values.includes(val.id)
                                            ? found.values.filter((v: any) => v !== val.id)
                                            : [...found.values, val.id]
                                          return prev.map((c: any) => (c.category_id === cat.id ? { ...c, values } : c))
                                        } else {
                                          return [...prev, { category_id: cat.id, values: [val.id] }]
                                        }
                                      })
                                    }}
                                  >
                                    {val.value}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          className="mt-4"
                          onClick={() => {
                            if (selectedCategories.length >= 3) {
                              toast({ title: "En fazla 3 varyant kategorisi ekleyebilirsiniz." })
                              return
                            }
                            handleCreateCombinations()
                          }}
                        >
                          Kombinasyonları Oluştur
                        </Button>
                        <div className="mt-8">
                          <h4 className="font-medium mb-2">Varyant Kombinasyonları</h4>
                          {combinations.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                              Henüz kombinasyon oluşturulmadı.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full border text-sm">
                                <thead>
                                  <tr className="bg-gray-100">
                                    <th className="p-2">Kombinasyon</th>
                                    <th className="p-2">Fiyat (₺)</th>
                                    <th className="p-2">İndirim (%)</th>
                                    <th className="p-2">İndirimli Fiyat (₺)</th>
                                    <th className="p-2">Resim</th>
                                    <th className="p-2">Stok</th>
                                    <th className="p-2">Varsayılan</th>
                                    <th className="p-2">Sil</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {combinations.map((row, idx) => (
                                    <tr key={idx} className="border-b">
                                      <td className="p-2 font-medium">
                                        {row.values.map((v: any) => v.value).join(" - ")}
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          type="number"
                                          value={row.price}
                                          onChange={(e) => {
                                            const price = Math.max(0, Number(e.target.value))
                                            updateCombination(idx, { price })
                                          }}
                                          className="w-28"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          type="number"
                                          value={row.discount_percent || ""}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            const discount_percent = val === "" ? undefined : Math.max(0, Math.min(100, Number(val)));
                                            let discount_price = row.price;
                                            if (discount_percent && discount_percent > 0) {
                                              discount_price = Math.round(row.price * (1 - discount_percent / 100));
                                            }
                                            updateCombination(idx, { discount_percent, discount_price });
                                          }}
                                          className="w-20"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          type="number"
                                          value={row.discount_price || ""}
                                          onChange={(e) =>
                                            updateCombination(idx, { discount_price: e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)) })
                                          }
                                          className="w-28"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <div className="flex flex-col items-center gap-1 w-28">
                                          {(row.pendingImagePreview || row.image_url) && (
                                            <div className="relative w-16 h-16 border rounded mb-1">
                                              <img
                                                src={row.pendingImagePreview || row.image_url}
                                                alt="Varyant Resmi"
                                                className="object-cover w-full h-full rounded"
                                              />
                                              <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0.5"
                                                onClick={() => handleRemoveVariantImage(idx)}
                                              >
                                                <X className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          )}
                                          <label className={`cursor-pointer text-xs py-1 px-2 rounded border ${row.pendingImagePreview || row.image_url ? 'border-gray-300 hover:bg-gray-50' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
                                            {row.pendingImagePreview || row.image_url ? 'Değiştir' : 'Yükle'}
                                            <input
                                              type="file"
                                              accept="image/*"
                                              className="hidden"
                                              onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                  const file = e.target.files[0];
                                                  if (!file.type.startsWith("image/")) {
                                                    toast({ title: "Hata", description: "Sadece resim dosyaları yüklenebilir.", variant: "destructive" });
                                                    return;
                                                  }
                                                  if (file.size > 2 * 1024 * 1024) {
                                                    toast({ title: "Hata", description: "Varyant resmi boyutu 2MB'dan küçük olmalıdır.", variant: "destructive" });
                                                    return;
                                                  }
                                                  handleVariantImageSelect(file, idx);
                                                }
                                              }}
                                            />
                                          </label>
                                        </div>
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          type="number"
                                          value={row.stock_quantity}
                                          onChange={(e) => updateCombination(idx, { stock_quantity: Math.max(0, Number(e.target.value)) })}
                                          className="w-20"
                                        />
                                      </td>
                                      <td className="p-2 text-center">
                                        <input
                                          type="radio"
                                          name="default_variant"
                                          checked={row.is_default}
                                          onChange={() => setDefaultCombination(idx)}
                                        />
                                      </td>
                                      <td className="p-2 text-center">
                                        <Button
                                          type="button"
                                          variant="destructive"
                                          size="icon"
                                          onClick={() => removeCombination(idx)}
                                        >
                                          <Trash className="h-4 w-4" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  {/* Görseller Alanı */}
                  <div>
                    <h2 className="text-lg font-semibold mb-4 mt-8">Ürün Görselleri</h2>
                    <Card>
                      <CardContent>
                        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-8 mb-6">
                          <ImageIcon className="h-10 w-10 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium mb-2">Ürün Görselleri</h3>
                          <p className="text-sm text-muted-foreground text-center mb-4">
                            PNG, JPG veya WEBP formatında görseller yükleyin. İlk yüklenen görsel otomatik olarak ana
                            görsel olarak ayarlanır.
                          </p>
                          <Input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePendingImageSelect}
                            className="max-w-sm"
                          />
                          {pendingImages.length > 0 && (
                            <div className="mt-4 flex flex-col items-center">
                              <div className="flex gap-2 mb-2">
                                {pendingImages.map((file, idx) => (
                                  <div
                                    key={idx}
                                    className="w-20 h-20 border rounded flex items-center justify-center bg-gray-100"
                                  >
                                    <img
                                      src={URL.createObjectURL(file)}
                                      alt={file.name}
                                      className="object-cover w-full h-full rounded"
                                    />
                                  </div>
                                ))}
                              </div>
                              <Button type="button" onClick={handleUploadPendingImages}>
                                Yükle
                              </Button>
                            </div>
                          )}
                        </div>
                        {images.length > 0 && (
                          <div className="mt-6">
                            <h3 className="text-lg font-medium mb-4">Yüklenen Görseller</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {images.map((image, index) => (
                                <SignedImageCard
                                  key={image.id || index}
                                  image={image}
                                  onRemove={handleRemoveImage}
                                  onSetPrimary={handleSetPrimary}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  <div className="flex justify-end mt-8">
                    <Button type="submit" disabled={loading} size="lg" className="px-8 py-3 text-base font-semibold">
                      Kaydet
                    </Button>
                  </div>
                </form>
              </FormProvider>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

function SignedImageCard({ image, onRemove, onSetPrimary }: any) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  useEffect(() => {
    async function fetchUrl() {
      if (image.url) {
        try {
          let path = image.url;
          // If it's a complete URL, extract just the path part
          if (path.includes('/storage/v1/')) {
            path = path.split('/storage/v1/object/public/')[1] || path;
          }
          // Make sure we're using the right bucket/prefix
          if (!path.startsWith('images/')) {
            path = `images/${path}`;
          }

          const url = await getSignedImageUrl(path);
          setSignedUrl(url);
        } catch (error) {
          console.error("Error getting signed URL:", error);
        }
      }
    }
    fetchUrl()
  }, [image.url])
  return (
    <div className={`relative rounded-md overflow-hidden border ${image.is_primary ? "ring-2 ring-primary" : ""}`}>
      <img
        src={signedUrl || "/placeholder.svg"}
        alt={image.alt_text || "Ürün görseli"}
        className="w-full h-40 object-cover"
        onError={(e) => {
          ; (e.target as HTMLImageElement).src = "/placeholder.svg"
        }}
      />
      <div className="absolute top-2 right-2 flex space-x-1">
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-6 w-6 rounded-full"
          onClick={() => onRemove(image.id)}
        >
          <Trash className="h-3 w-3" />
        </Button>
      </div>
      <Button
        type="button"
        variant={image.is_primary ? "default" : "secondary"}
        size="sm"
        className="absolute bottom-2 right-2"
        onClick={() => onSetPrimary(image.id)}
        disabled={image.is_primary}
      >
        {image.is_primary ? "Ana Görsel" : "Ana Görsel Yap"}
      </Button>
    </div>
  )
}

