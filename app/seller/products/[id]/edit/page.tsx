"use client"
import type React from "react"
import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import SellerSidebar from "@/components/seller/seller-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Trash, ImageIcon, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"

const productSchema = z.object({
  name: z.string().min(3, { message: "Ürün adı en az 3 karakter olmalıdır" }),
  price: z.coerce.number().positive({ message: "Fiyat pozitif bir değer olmalıdır" }),
  store_id: z.string().uuid({ message: "Mağaza seçin" }),
  category_id: z.string().uuid({ message: "Kategori seçin" }),
  description: z.string().optional(),
  short_description: z.string().optional(),
  discount_price: z.coerce.number().positive().optional().nullable(),
  stock_quantity: z.coerce.number().int().nonnegative().optional(),
  is_active: z.boolean(),
  has_variants: z.boolean(),
})

const supabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function getSignedImageUrl(path: string): Promise<string | null> {
  const { data, error } = await supabaseClient.storage.from("images").createSignedUrl(path, 60 * 60 * 24 * 365 * 100) // 100 yıl
  if (error) {
    console.error("Signed URL alınırken hata:", error)
    return null
  }
  return data?.signedUrl || null
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<any[]>([])
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
  const formRef = useRef<HTMLFormElement>(null)
  const [variantCategories, setVariantCategories] = useState<any[]>([])
  const [selectedCategories, setSelectedCategories] = useState<any[]>([])
  const [combinations, setCombinations] = useState<any[]>([])
  const [pendingImages, setPendingImages] = useState<File[]>([])

  const methods = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: formDefault || {
      name: "",
      price: 0,
      store_id: "",
      category_id: "",
      description: "",
      short_description: "",
      discount_price: null,
      stock_quantity: 0,
      is_active: true,
      has_variants: false,
    },
    mode: "onChange",
  })

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
          .eq("id", String(productId))
          .single()
        if (productError || !product || typeof product !== "object" || !("has_variants" in product))
          throw new Error(productError?.message || "Ürün bulunamadı")
        setFormDefault(product)
        setHasVariants((product as any).has_variants)
        methods.reset(product)
        // Varyantlar ve kombinasyonlar
        if ((product as any).has_variants && (product as any).id) {
          const { data: variantData } = await supabase
            .from("product_variants")
            .select("*, product_variant_values(value_id, value:variant_values(id, value))")
            .eq("product_id", String((product as any).id))
          setVariants(variantData || [])
          // Mevcut kombinasyonları combinations state'ine uygun şekilde set et
          setCombinations(
            (variantData || []).map((variant) => ({
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
            })),
          )
        } else {
          setCombinations([])
        }
        // Görseller
        if ((product as any).id) {
          const { data: imageData } = await supabase
            .from("product_images")
            .select("id, url, is_primary")
            .eq("product_id", String((product as any).id))
          setImages(imageData || [])
        }
        // Kategoriler
        const { data: categoriesData } = await supabase
          .from("categories")
          .select("id, name")
          .eq("is_active", true as any)
          .order("name")
        setCategories(categoriesData || [])
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

  // Kategorileri ve değerleri Supabase'den çek
  useEffect(() => {
    async function fetchVariantCategories() {
      const { data: cats } = await supabase.from("variant_categories").select("id, name")
      if (cats) {
        // Her kategori için değerleri çek
        const catsWithValues = await Promise.all(
          cats.map(async (cat: any) => {
            const { data: vals } = await supabase.from("variant_values").select("id, value").eq("category_id", cat.id)
            return { ...cat, values: vals || [] }
          }),
        )
        setVariantCategories(catsWithValues)
      }
    }
    fetchVariantCategories()
  }, [])

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
        const { data: publicUrlData, error: publicUrlError } = supabase.storage.from("images").getPublicUrl(filePath)
        const publicUrl = publicUrlData?.publicUrl
        console.log("filePath:", filePath)
        console.log("publicUrl:", publicUrl)
        if (!publicUrl || publicUrlError) {
          toast({ title: "Hata", description: "Görselin public URL'i alınamadı.", variant: "destructive" })
          // Dosya yüklendiyse sil
          await supabase.storage.from("images").remove([filePath])
          continue
        }
        // Add to product_images table
        const { error: dbError, data: imageData } = await supabase
          .from("product_images")
          .insert({
            product_id: params.id,
            url: publicUrl,
            is_primary: images.length === 0 && uploadedImages.length === 0, // İlk yüklenen ana görsel
            alt_text: file.name,
          })
          .select()
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
        uploadedImages.push({
          id: imageData.id,
          url: publicUrl,
          is_primary: images.length === 0 && uploadedImages.length === 0,
          alt_text: file.name,
        })
      }
      // Update local state with new images
      if (uploadedImages.length > 0) {
        const updatedImages = [...images, ...uploadedImages]
        setImages(updatedImages)
        setPendingImages([])
        // Update product's image_url if this is the first image
        if (images.length === 0) {
          await supabase.from("products").update({ image_url: uploadedImages[0].url }).eq("id", params.id)
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
      const { error } = await supabase.from("product_images").delete().eq("id", id)

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
        .update({ is_primary: false })
        .eq("product_id", params.id)

      if (updateError) throw updateError

      // Set selected image as primary
      const { error: setPrimaryError } = await supabase.from("product_images").update({ is_primary: true }).eq("id", id)

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
      // Ürün güncelle
      await supabase
        .from("products")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", String(productId))
      // Varyant kombinasyonlarını güncelle
      if (data.has_variants) {
        // 1. Var olan kombinasyon id'lerini topla
        const { data: existingData } = await supabase.from("product_variants").select("id").eq("product_id", productId)
        const existingIds = (existingData || []).map((v) => v.id)
        // 2. Yeni kombinasyonların id'lerini topla
        const newIds = combinations.filter((c) => c.id).map((c) => c.id)
        // 3. Silinenleri bul ve sil
        const toDelete = existingIds.filter((id) => !newIds.includes(id))
        for (const id of toDelete) {
          await supabase.from("product_variants").delete().eq("id", id)
        }
        // 4. Güncelle/ekle
        for (const combo of combinations) {
          if (combo.id) {
            // Güncelle
            await supabase
              .from("product_variants")
              .update({
                price: combo.price,
                stock_quantity: combo.stock_quantity,
                is_default: combo.is_default,
                is_active: combo.is_active,
                name: combo.values.map((v: any) => v.value).join(" - "),
              } as any)
              .eq("id", combo.id)
          } else {
            // Ekle
            const { data: inserted } = await supabase
              .from("product_variants")
              .insert({
                product_id: productId,
                price: combo.price,
                stock_quantity: combo.stock_quantity,
                is_default: combo.is_default,
                is_active: combo.is_active,
                name: combo.values.map((v: any) => v.value).join(" - "),
              } as any)
              .select()
              .single()
            // Sonra product_variant_values tablosuna da ekle
            for (const v of combo.values) {
              await supabase.from("product_variant_values").insert({
                product_variant_id: inserted.id,
                value_id: v.id,
              } as any)
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
                    <Input {...methods.register("price")} placeholder="Fiyat" type="number" required min={0} />
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
                    <Textarea {...methods.register("description")} placeholder="Detaylı Açıklama" />
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
                                            const price = Number(e.target.value)
                                            let discount_price = row.discount_price
                                            if (row.discount_percent) {
                                              discount_price = Math.round(price * (1 - row.discount_percent / 100))
                                            }
                                            updateCombination(idx, { price, discount_price })
                                          }}
                                          className="w-28"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          type="number"
                                          min={0}
                                          max={100}
                                          value={row.discount_percent || ""}
                                          onChange={(e) => {
                                            const discount_percent = Number(e.target.value)
                                            let discount_price = row.price
                                            if (discount_percent > 0) {
                                              discount_price = Math.round(row.price * (1 - discount_percent / 100))
                                            }
                                            updateCombination(idx, { discount_percent, discount_price })
                                          }}
                                          className="w-20"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          type="number"
                                          value={row.discount_price || ""}
                                          onChange={(e) =>
                                            updateCombination(idx, { discount_price: Number(e.target.value) })
                                          }
                                          className="w-28"
                                        />
                                      </td>
                                      <td className="p-2">
                                        {/* Varyant resmi yükleme alanı */}
                                        <div className="flex flex-col items-center gap-2">
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                              if (!e.target.files || e.target.files.length === 0) return
                                              const file = e.target.files[0]
                                              // Sadece state'e ekle, yükleme yok
                                              updateCombination(idx, { pendingImage: file })
                                            }}
                                          />
                                          {row.pendingImage && (
                                            <>
                                              <img
                                                src={URL.createObjectURL(row.pendingImage)}
                                                alt="Seçilen Varyant Resmi"
                                                className="w-12 h-12 object-cover mt-2 rounded"
                                              />
                                              <Button
                                                type="button"
                                                size="sm"
                                                onClick={async () => {
                                                  try {
                                                    // Yükleme işlemi
                                                    const file = row.pendingImage
                                                    if (!file) {
                                                      toast({
                                                        title: "Hata",
                                                        description: "Lütfen bir resim seçin.",
                                                        variant: "destructive",
                                                      })
                                                      return
                                                    }

                                                    // Dosya tipi kontrolü
                                                    if (!file.type.startsWith("image/")) {
                                                      toast({
                                                        title: "Hata",
                                                        description: "Sadece resim dosyaları yüklenebilir.",
                                                        variant: "destructive",
                                                      })
                                                      return
                                                    }

                                                    // Dosya boyutu kontrolü (5MB)
                                                    if (file.size > 5 * 1024 * 1024) {
                                                      toast({
                                                        title: "Hata",
                                                        description: "Dosya boyutu 5MB'dan küçük olmalıdır.",
                                                        variant: "destructive",
                                                      })
                                                      return
                                                    }

                                                    const fileName = `variant_${Date.now()}_${file.name}`
                                                    const { data, error } = await supabase.storage
                                                      .from("product-variant-images")
                                                      .upload(fileName, file)

                                                    if (error) {
                                                      toast({
                                                        title: "Resim yüklenemedi",
                                                        description: error.message,
                                                        variant: "destructive",
                                                      })
                                                      return
                                                    }

                                                    const publicUrl = supabase.storage
                                                      .from("product-variant-images")
                                                      .getPublicUrl(fileName).data.publicUrl

                                                    // Eğer varyant ID'si varsa (mevcut varyant), resmi product_variant_images tablosuna kaydet
                                                    if (row.id) {
                                                      const { error: dbError } = await supabase
                                                        .from("product_variant_images")
                                                        .insert({
                                                          product_variant_id: row.id,
                                                          url: publicUrl,
                                                          is_primary: true,
                                                        })

                                                      if (dbError) {
                                                        toast({
                                                          title: "Resim kaydedilemedi",
                                                          description: dbError.message,
                                                          variant: "destructive",
                                                        })
                                                        // Yüklenen dosyayı storage'dan sil
                                                        await supabase.storage
                                                          .from("product-variant-images")
                                                          .remove([fileName])
                                                        return
                                                      }
                                                    }

                                                    updateCombination(idx, {
                                                      image: publicUrl,
                                                      pendingImage: undefined,
                                                    })
                                                    toast({
                                                      title: "Başarılı",
                                                      description: "Varyant resmi başarıyla yüklendi.",
                                                    })
                                                  } catch (error: any) {
                                                    toast({
                                                      title: "Hata",
                                                      description:
                                                        error.message || "Resim yüklenirken bir hata oluştu.",
                                                      variant: "destructive",
                                                    })
                                                  }
                                                }}
                                              >
                                                Yükle
                                              </Button>
                                            </>
                                          )}
                                          {row.image && !row.pendingImage && (
                                            <img
                                              src={row.image}
                                              alt="Varyant Resmi"
                                              className="w-12 h-12 object-cover mt-2 rounded"
                                            />
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          type="number"
                                          value={row.stock_quantity}
                                          onChange={(e) => updateCombination(idx, { stock_quantity: e.target.value })}
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
        // Sadece dosya yolunu al
        const path = image.url.split("/object/public/images/")[1] || image.url.split("/images/")[1] || image.url
        const url = await getSignedImageUrl("products/" + path.split("products/")[1])
        setSignedUrl(url)
        console.log("Signed URL:", url)
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
          ;(e.target as HTMLImageElement).src = "/placeholder.svg"
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
