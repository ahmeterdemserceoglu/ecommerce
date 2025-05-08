"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useForm, FormProvider, useFormContext } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash, Loader2, Plus } from "lucide-react"
import { slugify } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

// Create a supabase admin client with RLS bypassing capability using service role
// WARNING: Only use this for development purposes
const supabaseAdmin = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
})

// --- Zod Şeması ---
const productSchema = z.object({
  name: z.string().min(3, { message: "Ürün adı en az 3 karakter olmalıdır" }),
  slug: z.string().min(3, { message: "Slug en az 3 karakter olmalıdır" }),
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

const variantSchema = z.object({
  name: z.string().min(1, { message: "Varyant adı gereklidir" }),
  price: z.coerce.number().positive({ message: "Fiyat pozitif bir değer olmalıdır" }),
  discount_price: z.coerce.number().positive().optional().nullable(),
  stock_quantity: z.coerce.number().int().nonnegative(),
  is_default: z.boolean().default(false),
})

// --- Ana Component ---
export default function NewProductPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [myStore, setMyStore] = useState<any>(null)
  const [images, setImages] = useState<{ file: File; preview: string; primary: boolean; url: string }[]>([])
  const [variants, setVariants] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)
  const [variantCategories, setVariantCategories] = useState<any[]>([])
  const [selectedCategories, setSelectedCategories] = useState<any[]>([])
  const [combinations, setCombinations] = useState<any[]>([])
  const [sessionChecked, setSessionChecked] = useState(false)
  const [unsaved, setUnsaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [variantTypes, setVariantTypes] = useState<any[]>([]) // [{id, name, values: [{id, value}]}]
  const variantTypeRefs = useRef<Array<HTMLInputElement | null>>([])
  // Varyant kombinasyonları tablosuna resim yükleme özelliği ekle
  // variantCombinations state'ini güncelle
  const [variantCombinations, setVariantCombinations] = useState<any[]>([])
  const [showVariantTypeModal, setShowVariantTypeModal] = useState(false)
  const [newVariantTypeName, setNewVariantTypeName] = useState("")
  const [variantInputValues, setVariantInputValues] = useState<Record<string, string>>({})

  // --- Form Setup ---
  const methods = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      slug: "",
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
  const { watch, setValue, getValues, trigger, formState } = methods

  // --- Stepper ---
  const steps = ["Temel Bilgiler", "Varyantlar", "Görseller", "Önizleme"]

  // --- Oturum ve Data Fetch ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("*")
          .order("name")

        if (categoriesError) throw categoriesError
        setCategories(categoriesData || [])

        // Fetch user's store
        if (user) {
          const { data: storeData, error: storeError } = await supabase
            .from("stores")
            .select("*")
            .eq("user_id", user.id)
            .single()

          if (storeError) throw storeError
          if (storeData) {
            setMyStore(storeData)
            methods.setValue("store_id", storeData.id)
          }
        }
      } catch (error: any) {
        console.error("Error fetching data:", error)
        toast({
          title: "Hata",
          description: "Veriler yüklenirken bir hata oluştu.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
        setSessionChecked(true)
      }
    }

    if (!authLoading && user) {
      fetchData()
    }
  }, [user, authLoading])

  // --- Otomatik Slug ---
  useEffect(() => {
    const name = watch("name")
    if (name) setValue("slug", slugify(name))
  }, [watch("name")])

  // --- Unsaved Changes Uyarısı ---
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (unsaved) {
        e.preventDefault()
        e.returnValue = "Kaydedilmemiş değişiklikler var. Çıkmak istediğinize emin misiniz?"
      }
    }
    window.addEventListener("beforeunload", beforeUnload)
    return () => window.removeEventListener("beforeunload", beforeUnload)
  }, [unsaved])

  useEffect(() => {
    setUnsaved(formState.isDirty)
  }, [formState.isDirty])

  // --- Görsel Yükleme ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    // Dosya tipi ve boyut kontrolü
    if (!file.type.startsWith("image/")) {
      toast({ title: "Hata", description: "Sadece resim dosyaları yüklenebilir.", variant: "destructive" })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Hata", description: "Dosya boyutu 5MB'dan küçük olmalıdır.", variant: "destructive" })
      return
    }
    // Benzersiz dosya adı oluştur
    const fileExt = file.name.split(".").pop()
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
    const filePath = `products/${fileName}`
    // Storage'a yükle
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(filePath, file, { cacheControl: "3600", upsert: false })
    if (uploadError) {
      toast({ title: "Hata", description: `Resim yüklenemedi: ${uploadError.message}`, variant: "destructive" })
      return
    }
    // Public URL al
    const { data: publicUrlData, error: publicUrlError } = supabase.storage.from("images").getPublicUrl(filePath)
    const publicUrl = publicUrlData?.publicUrl
    if (!publicUrl || publicUrlError) {
      toast({ title: "Hata", description: "Resim için public URL alınamadı.", variant: "destructive" })
      return
    }
    // State'e ekle
    setImages([...images, { file, preview: publicUrl, primary: images.length === 0, url: publicUrl }])
    setUnsaved(true)
  }
  const handleRemoveImage = (index: number) => {
    const newImages = [...images]
    URL.revokeObjectURL(newImages[index].preview)
    newImages.splice(index, 1)
    if (images[index].primary && newImages.length > 0) newImages[0].primary = true
    setImages(newImages)
    setUnsaved(true)
  }
  const handleSetPrimary = (index: number) => {
    setImages(images.map((img, i) => ({ ...img, primary: i === index })))
    setUnsaved(true)
  }

  // --- Varyant Fonksiyonları ---
  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: `variant-${Date.now()}`,
        name: "",
        price: getValues("price"),
        discount_price: getValues("discount_price"),
        stock_quantity: 0,
        is_default: prev.length === 0,
      },
    ])
    setUnsaved(true)
  }
  const updateVariant = (id: string, data: Partial<any>) => {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...data } : v)))
    setUnsaved(true)
  }
  const removeVariant = (id: string) => {
    setVariants((prev) => {
      const newVariants = prev.filter((v) => v.id !== id)
      if (prev.find((v) => v.id === id)?.is_default && newVariants.length > 0) newVariants[0].is_default = true
      return newVariants
    })
    setUnsaved(true)
  }
  const setDefaultVariant = (id: string) => {
    setVariants((prev) => prev.map((v) => ({ ...v, is_default: v.id === id })))
    setUnsaved(true)
  }
  const validateVariants = () => {
    if (watch("has_variants")) {
      if (!variantTypes.length) {
        setError("Varyantlı ürün için en az bir varyant türü eklemelisiniz.")
        return false
      }
      for (const type of variantTypes) {
        if (!type.name.trim()) {
          setError("Her varyant türünün bir adı olmalı.")
          return false
        }
        if (!type.values.length || type.values.some((val: any) => !val.value.trim())) {
          setError("Her varyant türü için en az bir özellik/değer girilmeli ve boş bırakılmamalı.")
          return false
        }
      }
    }
    setError(null)
    return true
  }

  // --- Yardımcı: Benzersiz slug üretici ---
  async function generateUniqueSlug(baseSlug: string) {
    let slug = baseSlug
    let counter = 1
    while (true) {
      const { data } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug as any)
        .single()
      if (!data) break
      slug = `${baseSlug}-${counter++}`
    }
    return slug
  }

  // --- Varyant Kombinasyonları Oluşturma ---
  const generateCombinations = () => {
    if (!watch("has_variants") || variantTypes.length === 0 || variantTypes.some((t) => t.values.length === 0)) {
      setVariantCombinations([])
      return
    }
    function cartesian(arr: any[][]) {
      return arr.reduce((a, b) => a.flatMap((d: any) => b.map((e: any) => [...d, e])), [[]])
    }
    const allValues = (variantTypes || []).map((type) =>
      (type.values || []).map((val) => ({ typeId: type.id, typeName: type.name, valueId: val.id, value: val.value })),
    )
    const combos = cartesian(allValues)
    setVariantCombinations(
      combos.map((combo: any[], idx: number) => {
        const comboKey = combo.length > 0 ? `${combo.map((c) => c.value).join("-")}-${idx}` : `variant-${idx}`

        return {
          key: comboKey,
          combo,
          price: "",
          stock_quantity: "",
          is_default: idx === 0,
          image: null,
        }
      }),
    )
  }

  // --- Önizleme Verileri ---
  const getPreviewData = () => {
    const formData = methods.getValues()
    return {
      ...formData,
      variants: variantCombinations.map((v) => ({
        name: v.combo.map((c: any) => c.value).join(" - "),
        price: v.price,
        stock: v.stock_quantity,
        is_default: v.is_default,
        image: v.image?.preview,
      })),
      images: images.map((img) => ({
        url: img.preview,
        is_primary: img.primary,
      })),
    }
  }

  // --- Form Submit ---
  const onSubmit = async (data: any) => {
    try {
      setLoading(true)
      setError(null)

      // Create product using service role client
      const { data: productData, error: productError } = await supabaseAdmin
        .from("products")
        .insert({
          ...data,
          is_approved: null,
          reject_reason: null,
        })
        .select()
        .single()

      if (productError) {
        console.error("Error creating product:", productError)
        setError(productError.message || JSON.stringify(productError))
        toast({
          title: "Hata",
          description: productError.message || JSON.stringify(productError),
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Handle variants if any
      if (watch("has_variants") && variantTypes.length > 0) {
        // 1. Save variant categories
        const variantCategories = variantTypes.map((type) => ({
          name: type.name,
          display_name: type.name,
          product_id: productData.id,
        }))

        const { data: categoryData, error: categoryError } = await supabaseAdmin
          .from("variant_categories")
          .insert(variantCategories)
          .select()

        if (categoryError) throw categoryError

        // 2. Save variant values
        const variantValues = (variantTypes || []).flatMap((type, typeIndex) =>
          (type.values || []).map((val) => ({
            category_id: categoryData[typeIndex].id,
            value: val.value,
            display_value: val.value,
          })),
        )

        const { data: valueData, error: valueError } = await supabaseAdmin
          .from("variant_values")
          .insert(variantValues)
          .select()

        if (valueError) throw valueError

        // 3. Save variant combinations
        const newVariantCombinations = variantCombinations.map((combo) => ({
          product_id: productData.id,
          name: combo.combo.map((c: any) => c.value).join(" - "),
          price: combo.price || data.price,
          stock_quantity: combo.stock_quantity || 0,
          is_default: combo.is_default,
          combo: combo.combo,
        }))

        const { data: variantData, error: variantError } = await supabaseAdmin
          .from("product_variants")
          .insert(newVariantCombinations)
          .select()

        if (variantError) throw variantError

        // 4. Save variant value combinations
        const variantValueCombinations = newVariantCombinations.flatMap((combo, comboIndex) =>
          combo.combo.map((c: any) => ({
            variant_id: variantData[comboIndex].id,
            value_id: valueData.find((v: any) => v.value === c.value)?.id,
          })),
        )

        const { error: valueComboError } = await supabaseAdmin
          .from("product_variant_values")
          .insert(variantValueCombinations)

        if (valueComboError) throw valueComboError

        // --- VARYANT GÖRSELLERİNİ KAYDET ---
        for (let i = 0; i < variantCombinations.length; i++) {
          const combo = variantCombinations[i]
          if (combo.image?.url && variantData[i]?.id) {
            await supabaseAdmin.from("product_variant_images").insert({
              product_variant_id: variantData[i].id,
              url: combo.image.url,
              is_primary: true,
              alt_text: combo.image.file?.name || "",
            })
          }
        }
      }

      // --- GÖRSELLERİ YÜKLE VE KAYDET ---
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const img = images[i]
          // product_images tablosuna ekle
          await supabaseAdmin.from("product_images").insert({
            product_id: productData.id,
            url: img.url,
            is_primary: img.primary || i === 0,
            alt_text: img.file?.name || "",
          })
          // İlk resmi products tablosuna da image_url olarak ekle
          if (i === 0) {
            await supabaseAdmin.from("products").update({ image_url: img.url }).eq("id", productData.id)
          }
        }
      }

      toast({
        title: "Başarılı",
        description: "Ürün başarıyla eklendi.",
      })

      router.push("/seller/products")
    } catch (error: any) {
      console.error("Error creating product:", error)
      setError(error.message)
      toast({
        title: "Hata",
        description: "Ürün eklenirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // --- Stepper UI ---
  const Stepper = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, i) => (
        <React.Fragment key={`step-${i}`}>
          <div
            className={`rounded-full w-8 h-8 flex items-center justify-center text-white font-bold ${i <= currentStep ? "bg-primary" : "bg-gray-300"}`}
          >
            {i + 1}
          </div>
          {i < steps.length - 1 && <div className={`h-1 w-8 ${i < currentStep ? "bg-primary" : "bg-gray-300"}`} />}
        </React.Fragment>
      ))}
    </div>
  )

  // --- Variant Type/Value Helper Functions (must be inside the component) ---
  function handleAddVariantType() {
    setShowVariantTypeModal(true)
  }
  function confirmAddVariantType() {
    if (newVariantTypeName.trim()) {
      const newId = `type-${Date.now()}`
      setVariantTypes((prev) => [...prev, { id: newId, name: newVariantTypeName.trim(), values: [] }])
      setTimeout(() => {
        const idx = variantTypes.length
        if (variantTypeRefs.current[idx]) {
          variantTypeRefs.current[idx]?.focus()
        }
      }, 50)
      setNewVariantTypeName("")
      setShowVariantTypeModal(false)
    }
  }
  function removeVariantType(id: string) {
    setVariantTypes((prev) => prev.filter((v: any) => v.id !== id))
  }
  function updateVariantTypeName(id: string, name: string) {
    setVariantTypes((prev) => prev.map((v: any) => (v.id === id ? { ...v, name } : v)))
  }
  function addVariantValue(typeId: string, value: string) {
    setVariantTypes((prev) =>
      prev.map((v: any) => (v.id === typeId ? { ...v, values: [...v.values, { id: `val-${Date.now()}`, value }] } : v)),
    )
  }
  function removeVariantValue(typeId: string, valueId: string) {
    setVariantTypes((prev) =>
      prev.map((v: any) => (v.id === typeId ? { ...v, values: v.values.filter((val: any) => val.id !== valueId) } : v)),
    )
  }
  function updateVariantValue(typeId: string, valueId: string, value: string) {
    setVariantTypes((prev) =>
      prev.map((v: any) =>
        v.id === typeId
          ? { ...v, values: v.values.map((val: any) => (val.id === valueId ? { ...val, value } : val)) }
          : v,
      ),
    )
  }

  // Varyant kombinasyon tablosunda resim seçildiğinde storage'a yükle
  const handleVariantImageUpload = async (file: File, idx: number) => {
    // Dosya tipi ve boyut kontrolü
    if (!file.type.startsWith("image/")) {
      toast({ title: "Hata", description: "Sadece resim dosyaları yüklenebilir.", variant: "destructive" })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Hata", description: "Dosya boyutu 5MB'dan küçük olmalıdır.", variant: "destructive" })
      return
    }
    const fileExt = file.name.split(".").pop()
    const fileName = `variant_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `product-variant-images/${fileName}`
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(filePath, file, { cacheControl: "3600", upsert: false })
    if (uploadError) {
      toast({ title: "Hata", description: `Varyant resmi yüklenemedi: ${uploadError.message}`, variant: "destructive" })
      return
    }
    const { data: publicUrlData, error: publicUrlError } = supabase.storage.from("images").getPublicUrl(filePath)
    const publicUrl = publicUrlData?.publicUrl
    if (!publicUrl || publicUrlError) {
      toast({ title: "Hata", description: "Varyant resmi için public URL alınamadı.", variant: "destructive" })
      await supabase.storage.from("images").remove([filePath])
      return
    }
    setVariantCombinations((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, image: { url: publicUrl, file, preview: publicUrl } } : r)),
    )
  }

  // --- Main Render ---
  if (authLoading || !sessionChecked) {
    return (
      <div className="container py-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-lg">Yükleniyor...</p>
      </div>
    )
  }
  if (!user) {
    return (
      <div className="container py-6">
        <Alert variant="destructive">
          <AlertTitle>Erişim Hatası</AlertTitle>
          <AlertDescription>Bu sayfaya erişmek için giriş yapmanız gerekmektedir.</AlertDescription>
        </Alert>
      </div>
    )
  }
  return (
    <div className="container py-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Yeni Ürün Ekle</CardTitle>
        </CardHeader>
        <CardContent>
          <Stepper />
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
          <FormProvider {...methods}>
            <form ref={formRef} onSubmit={methods.handleSubmit(onSubmit)}>
              {/* Adım 1: Temel Bilgiler */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  <InputField name="name" label="Ürün Adı" required autoFocus value={methods.watch("name")} />
                  <InputField name="slug" label="Slug" disabled value={methods.watch("slug")} />
                  <InputField name="price" label="Fiyat (₺)" type="number" required value={methods.watch("price")} />
                  <SelectField
                    name="category_id"
                    label="Kategori"
                    options={categories}
                    optionLabel="name"
                    optionValue="id"
                    required
                    value={methods.watch("category_id")}
                  />
                  {myStore ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Mağaza</label>
                        <Input value={myStore.name} disabled readOnly />
                      </div>
                      <input type="hidden" {...methods.register("store_id")} value={myStore.id} />
                    </>
                  ) : (
                    <SelectField
                      name="store_id"
                      label="Mağaza"
                      options={stores}
                      optionLabel="name"
                      optionValue="id"
                      required
                    />
                  )}
                  <TextareaField name="short_description" label="Kısa Açıklama" />
                  <TextareaField name="description" label="Detaylı Açıklama" />
                  <SwitchField
                    name="is_active"
                    label="Aktif Ürün"
                    description="Ürün aktif olarak satışa sunulsun mu?"
                  />
                  <SwitchField
                    name="has_variants"
                    label="Varyantlı Ürün"
                    description="Ürünün renk, beden gibi farklı varyantları varsa bu seçeneği işaretleyin"
                    onChange={(e) => {
                      setValue("has_variants", e.target.checked)
                      if (e.target.checked) {
                        setValue("stock_quantity", 0)
                      }
                    }}
                  />
                  {!watch("has_variants") && <InputField name="stock_quantity" label="Stok Miktarı" type="number" />}
                  <div className="flex justify-between mt-6">
                    <div />
                    <Button
                      type="button"
                      onClick={async () => {
                        const valid = await trigger(["name", "slug", "price", "category_id", "store_id"])
                        if (valid) setCurrentStep(1)
                      }}
                    >
                      Devam
                    </Button>
                  </div>
                </div>
              )}
              {/* Adım 2: Varyantlar */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  {watch("has_variants") && (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Varyant Türleri ve Değerleri</h3>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddVariantType}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Varyant Türü Ekle
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {variantTypes.map((type, idx) => (
                          <Card key={type.id} className="p-4 mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-lg">{type.name || "Varyant Türü"}</span>
                              <Button
                                type="button"
                                size="icon"
                                variant="destructive"
                                onClick={() => removeVariantType(type.id)}
                                className="ml-2"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {type.values.map((val: any) => (
                                <span
                                  key={val.id}
                                  className="inline-flex items-center bg-gray-100 text-gray-800 rounded-full px-3 py-1 text-sm"
                                >
                                  {val.value}
                                  <button
                                    type="button"
                                    onClick={() => removeVariantValue(type.id, val.id)}
                                    className="ml-2 text-red-500 hover:text-red-700"
                                  >
                                    <Trash className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Input
                                name="newValue"
                                placeholder="Yeni özellik/değer ekle"
                                className="w-40"
                                autoComplete="off"
                                value={variantInputValues[type.id] || ""}
                                onChange={(e) =>
                                  setVariantInputValues((prev) => ({ ...prev, [type.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && (variantInputValues[type.id] || "").trim()) {
                                    addVariantValue(type.id, variantInputValues[type.id].trim())
                                    setVariantInputValues((prev) => ({ ...prev, [type.id]: "" }))
                                    e.preventDefault()
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={!(variantInputValues[type.id] || "").trim()}
                                onClick={() => {
                                  if ((variantInputValues[type.id] || "").trim()) {
                                    addVariantValue(type.id, variantInputValues[type.id].trim())
                                    setVariantInputValues((prev) => ({ ...prev, [type.id]: "" }))
                                  }
                                }}
                              >
                                Ekle
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>

                      {variantTypes.length > 0 && (
                        <div className="mt-6">
                          <Button type="button" onClick={generateCombinations} className="w-full">
                            Varyant Kombinasyonlarını Oluştur
                          </Button>
                        </div>
                      )}

                      {/* Kombinasyon Tablosu */}
                      {watch("has_variants") && variantCombinations.length > 0 && (
                        <div className="mt-8">
                          <h4 className="font-medium mb-4">Varyant Kombinasyonları</h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full border text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="p-2">Kombinasyon</th>
                                  <th className="p-2">Fiyat (₺)</th>
                                  <th className="p-2">Stok</th>
                                  <th className="p-2">Resim</th>
                                  <th className="p-2">Varsayılan</th>
                                </tr>
                              </thead>
                              <tbody>
                                {variantCombinations.map((row, idx) => (
                                  <tr key={row.key} className="border-b hover:bg-gray-50">
                                    <td className="p-2 font-medium">
                                      {row.combo.map((c: any) => c.value).join(" - ")}
                                    </td>
                                    <td className="p-2">
                                      <Input
                                        type="number"
                                        min="0"
                                        value={row.price}
                                        onChange={(e) => {
                                          const val = e.target.value
                                          setVariantCombinations((prev) =>
                                            prev.map((r, i) => (i === idx ? { ...r, price: val } : r)),
                                          )
                                        }}
                                        className="w-28"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <Input
                                        type="number"
                                        min="0"
                                        value={row.stock_quantity}
                                        onChange={(e) => {
                                          const val = e.target.value
                                          setVariantCombinations((prev) =>
                                            prev.map((r, i) => (i === idx ? { ...r, stock_quantity: val } : r)),
                                          )
                                        }}
                                        className="w-20"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <div className="flex items-center gap-2">
                                        {row.image ? (
                                          <div className="relative w-10 h-10 rounded overflow-hidden">
                                            <img
                                              src={row.image.preview || "/placeholder.svg"}
                                              alt={`Varyant ${row.combo.map((c: any) => c.value).join(" - ")}`}
                                              className="object-cover w-full h-full"
                                            />
                                            <button
                                              type="button"
                                              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5"
                                              onClick={() => {
                                                setVariantCombinations((prev) =>
                                                  prev.map((r, i) => (i === idx ? { ...r, image: null } : r)),
                                                )
                                              }}
                                            >
                                              <Trash className="h-3 w-3" />
                                            </button>
                                          </div>
                                        ) : (
                                          <label className="cursor-pointer">
                                            <div className="w-10 h-10 border-2 border-dashed rounded flex items-center justify-center">
                                              <Plus className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                              type="file"
                                              className="hidden"
                                              accept="image/*"
                                              onChange={async (e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                  await handleVariantImageUpload(e.target.files[0], idx)
                                                }
                                              }}
                                            />
                                          </label>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-2 text-center">
                                      <input
                                        type="radio"
                                        name="default_variant"
                                        checked={row.is_default}
                                        onChange={() =>
                                          setVariantCombinations((prev) =>
                                            prev.map((r, i) => ({ ...r, is_default: i === idx })),
                                          )
                                        }
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between mt-6">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(0)}>
                      Geri
                    </Button>
                    <Button type="button" onClick={() => setCurrentStep(2)}>
                      Devam
                    </Button>
                  </div>
                </div>
              )}
              {/* Adım 3: Görseller */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Ürün Görselleri</h3>
                  </div>
                  <div className="space-y-6">
                    {images.length > 0 ? (
                      images.map((image, idx) => (
                        <div key={`product-image-${idx}`} className="flex items-center gap-2">
                          <div className="relative w-24 h-24 rounded overflow-hidden">
                            <img
                              src={image.preview || "/placeholder.svg"}
                              alt={`Ürün Görsel ${idx + 1}`}
                              className="object-cover w-full h-full"
                            />
                            <button
                              type="button"
                              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5"
                              onClick={() => handleRemoveImage(idx)}
                            >
                              <Trash className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <input
                              type="radio"
                              name="primary_image"
                              checked={image.primary}
                              onChange={() => handleSetPrimary(idx)}
                              id={`primary-${idx}`}
                            />
                            <label htmlFor={`primary-${idx}`} className="text-sm">
                              Ana Görsel
                            </label>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-4 border-2 border-dashed rounded-md">
                        <p className="text-gray-500 mb-2">Henüz ürün görseli eklenmemiş</p>
                      </div>
                    )}

                    {/* Yeni resim ekleme alanı */}
                    <div className="mt-4">
                      <label className="cursor-pointer">
                        <div className="w-full h-20 border-2 border-dashed rounded flex items-center justify-center">
                          <div className="text-center">
                            <Plus className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                            <p className="text-sm text-gray-500">Resim Ekle</p>
                          </div>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-between mt-6">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                      Geri
                    </Button>
                    <Button type="button" onClick={() => setCurrentStep(3)}>
                      Devam
                    </Button>
                  </div>
                </div>
              )}
              {/* Adım 4: Önizleme */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Ürün Önizleme</h3>
                  </div>

                  <Card className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Sol Taraf - Ürün Detayları */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-lg">{methods.getValues("name")}</h4>
                        <p className="text-gray-600">{methods.getValues("short_description")}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{methods.getValues("price")} ₺</span>
                          {methods.getValues("discount_price") && (
                            <span className="text-sm text-gray-500 line-through">
                              {methods.getValues("discount_price")} ₺
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">Stok: {methods.getValues("stock_quantity")}</p>
                      </div>

                      {/* Sağ Taraf - Varyantlar */}
                      {watch("has_variants") && variantCombinations.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="font-medium">Varyantlar</h4>
                          <div className="space-y-2">
                            {variantCombinations.map((variant, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div>
                                  <p className="font-medium">{variant.combo.map((c: any) => c.value).join(" - ")}</p>
                                  <p className="text-sm text-gray-600">
                                    {variant.price} ₺ - Stok: {variant.stock_quantity}
                                  </p>
                                </div>
                                {variant.is_default && (
                                  <span className="text-xs bg-primary text-white px-2 py-1 rounded">Varsayılan</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Görseller */}
                    {images.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-medium mb-4">Ürün Görselleri</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {images.map((image, idx) => (
                            <div key={idx} className="relative aspect-square rounded overflow-hidden">
                              <img
                                src={image.preview}
                                alt={`Ürün Görsel ${idx + 1}`}
                                className="object-cover w-full h-full"
                              />
                              {image.primary && (
                                <span className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded">
                                  Ana Görsel
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>

                  <div className="flex justify-between mt-6">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                      Geri
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Ürün ekleniyor..." : "Ürünü Kaydet"}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </FormProvider>
          <Dialog open={showVariantTypeModal} onOpenChange={setShowVariantTypeModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Varyant Türü Ekle</DialogTitle>
              </DialogHeader>
              <Input
                autoFocus
                placeholder="Örn: Renk, Beden, Malzeme"
                value={newVariantTypeName}
                onChange={(e) => setNewVariantTypeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmAddVariantType()
                }}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowVariantTypeModal(false)}>
                  İptal
                </Button>
                <Button onClick={confirmAddVariantType} disabled={!newVariantTypeName.trim()}>
                  Ekle
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}

// Form Components
function InputField({ name, label, required, type = "text", disabled, autoFocus, value, ...props }: any) {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Input
        id={name}
        {...register(name)}
        type={type}
        disabled={disabled}
        autoFocus={autoFocus}
        defaultValue={value}
        {...props}
        className={errors[name] ? "border-red-500" : ""}
      />
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]?.message?.toString()}</p>}
    </div>
  )
}

function SelectField({ name, label, required, options, optionValue, optionLabel, value, ...props }: any) {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={name}
        {...register(name)}
        defaultValue={value}
        {...props}
        className={`w-full border rounded-md px-3 py-2 ${errors[name] ? "border-red-500" : "border-gray-300"}`}
      >
        <option value="">Seçiniz</option>
        {options?.map((option: any) => (
          <option key={option[optionValue]} value={option[optionValue]}>
            {option[optionLabel]}
          </option>
        ))}
      </select>
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]?.message?.toString()}</p>}
    </div>
  )
}

function TextareaField({ name, label, required, ...props }: any) {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        id={name}
        {...register(name)}
        {...props}
        className={`w-full border rounded-md px-3 py-2 ${errors[name] ? "border-red-500" : "border-gray-300"}`}
        rows={4}
      />
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]?.message?.toString()}</p>}
    </div>
  )
}

function SwitchField({ name, label, description, ...props }: any) {
  const { register } = useFormContext()

  return (
    <div className="flex items-center justify-between">
      <div>
        <label htmlFor={name} className="block text-sm font-medium">
          {label}
        </label>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      <div className="flex items-center h-6">
        <input
          type="checkbox"
          id={name}
          {...register(name)}
          {...props}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
      </div>
    </div>
  )
}
