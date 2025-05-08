"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useAuth } from "@/hooks/use-auth"
import {
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Settings,
  Store,
  Tag,
  Trash,
  Users,
  X,
  Edit,
  FileText,
  Database,
  Bell,
  AlertCircle,
  ShoppingBag,
  Star,
  Copy,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// Ürün tipi
interface Product {
  id: string
  name: string
  slug?: string
  description?: string
  price: number
  discount_price?: number
  stock_quantity: number
  is_active: boolean
  is_featured?: boolean
  has_variants?: boolean
  created_at: string
  image_url?: string
  is_approved?: boolean | null
  reject_reason?: string | null
  store?: { id: string; name: string; slug: string }
  category?: { id: string; name: string; slug: string }
  store_name?: string
  category_name?: string
}

type Tab = "new" | "pending" | "approved" | "rejected"

const TABS: { key: Tab; label: string }[] = [
  { key: "new", label: "Yeni Gelenler (1 Gün)" },
  { key: "pending", label: "Onay Bekleyenler" },
  { key: "approved", label: "Onaylananlar" },
  { key: "rejected", label: "Reddedilenler" },
]

console.log("ADMIN PRODUCTS PAGE RENDER EDİLİYOR")

export default function AdminProductsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [attributes, setAttributes] = useState<any[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isVariantsDialogOpen, setIsVariantsDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [variants, setVariants] = useState<any[]>([])
  const [newVariant, setNewVariant] = useState({
    name: "",
    sku: "",
    price: 0,
    discountPrice: 0,
    stockQuantity: 0,
    isDefault: false,
    options: {} as Record<string, string>,
  })
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    price: 0,
    discount_price: 0,
    stock_quantity: 0,
    category_id: "",
    store_id: "",
    is_active: true,
    is_featured: false,
    has_variants: false,
    image_url: "",
  })
  const [tab, setTab] = useState<Tab>("new")
  const [rejectModal, setRejectModal] = useState<{ open: boolean; product?: Product }>({ open: false })
  const [rejectReason, setRejectReason] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [recentProducts, setRecentProducts] = useState<Product[]>([])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          id, name, slug, description, price, discount_price, stock_quantity, 
          is_active, is_featured, has_variants, created_at, image_url,
          is_approved, reject_reason,
          store:store_id(id, name, slug),
          category:category_id(id, name, slug)
        `)
        .order("created_at", { ascending: false })

      if (productsError) {
        console.error("Error fetching products:", productsError)
        throw new Error(`Ürünler yüklenirken hata oluştu: ${productsError.message}`)
      }

      const formattedProducts = (productsData || []).map((p: any) => ({
        ...p,
        store: p.store ? (Array.isArray(p.store) ? p.store[0] : p.store) : undefined,
        category: p.category ? (Array.isArray(p.category) ? p.category[0] : p.category) : undefined,
        store_name: p.store?.name,
        category_name: p.category?.name,
      }))

      setProducts(formattedProducts)
    } catch (error: any) {
      console.error("Error fetching products:", error)
      toast({
        title: "Hata",
        description: error.message || "Ürünler yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Check if user is admin
    if (!authLoading && user) {
      if (user.role !== "admin") {
        router.push("/")
        return
      }
    } else if (!authLoading && !user) {
      router.push("/auth/login?returnTo=/admin/products")
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        // Ensure the required columns exist
        const ensureProductColumns = async () => {
          try {
            const { data: columnExists, error: checkError } = await supabase
              .rpc("check_table_exists", { table_name: "product_variants" })
              .single()

            if (checkError) {
              console.warn("Error checking product columns:", checkError)
              return
            }

            if (!(columnExists && typeof columnExists.exists === "boolean" && columnExists.exists)) {
              const response = await fetch("/api/admin/add-product-columns", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
              })

              if (!response.ok) {
                console.warn("Failed to add product columns. Some features may not work correctly.")
              } else {
                console.log("Product columns added successfully")
              }
            }
          } catch (error) {
            console.warn("Error checking product columns:", error)
          }
        }

        await ensureProductColumns()

        // Ensure the required tables exist
        const ensureRequiredTables = async () => {
          try {
            // Check if recent_products table exists
            const { data: recentProductsExists, error: recentProductsError } = await supabase
              .rpc("check_table_exists", { table_name: "recent_products" })
              .single()

            if (
              recentProductsError ||
              !(recentProductsExists && typeof recentProductsExists.exists === "boolean" && recentProductsExists.exists)
            ) {
              console.warn("recent_products table does not exist. Creating it...")

              // Create recent_products table if it doesn't exist
              const { error: createTableError } = await supabase.rpc("create_recent_products_table")

              if (createTableError) {
                console.warn("Failed to create recent_products table:", createTableError)
              } else {
                console.log("recent_products table created successfully")
              }
            }
          } catch (error) {
            console.warn("Error checking required tables:", error)
          }
        }

        await ensureRequiredTables()

        // Fetch all products with store and category info
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select(`
            id, name, slug, description, price, discount_price, stock_quantity, 
            is_active, is_featured, has_variants, created_at, image_url,
            is_approved, reject_reason,
            store:store_id(id, name, slug),
            category:category_id(id, name, slug)
          `)
          .order("created_at", { ascending: false })

        if (productsError) {
          console.error("Error fetching products:", productsError)
          throw new Error(`Ürünler yüklenirken hata oluştu: ${productsError.message}`)
        }

        const formattedProducts = (productsData || []).map((p: any) => ({
          ...p,
          store: p.store ? (Array.isArray(p.store) ? p.store[0] : p.store) : undefined,
          category: p.category ? (Array.isArray(p.category) ? p.category[0] : p.category) : undefined,
          store_name: p.store?.name,
          category_name: p.category?.name,
        }))

        setProducts(formattedProducts)

        // Fetch recent products
        try {
          // Fetch recent products only if the table exists
          const { data: tableExists } = await supabase
            .rpc("check_table_exists", { table_name: "recent_products" })
            .single()

          if (tableExists && tableExists.exists) {
            const { data: recentProductsData, error: recentProductsError } = await supabase
              .from("recent_products")
              .select(`
                id,
                product:product_id (
                  id, name, slug, description, price, discount_price, stock_quantity,
                  is_active, is_featured, has_variants, created_at, image_url,
                  store:store_id(id, name, slug),
                  category:category_id(id, name, slug)
                )
              `)
              .order("created_at", { ascending: false })

            if (recentProductsError) {
              console.error("Error fetching recent products:", recentProductsError)
            } else if (recentProductsData && recentProductsData.length > 0) {
              const formattedRecentProducts = recentProductsData
                .filter((rp) => rp.product) // Filter out null products
                .map((rp) => ({
                  ...rp.product,
                  store: rp.product.store
                    ? Array.isArray(rp.product.store)
                      ? rp.product.store[0]
                      : rp.product.store
                    : undefined,
                  category: rp.product.category
                    ? Array.isArray(rp.product.category)
                      ? rp.product.category[0]
                      : rp.product.category
                    : undefined,
                }))
              setRecentProducts(formattedRecentProducts)
            } else {
              setRecentProducts([])
            }
          } else {
            console.log("recent_products table does not exist")
            setRecentProducts([])
          }
        } catch (error) {
          console.error("Error fetching recent products:", error)
          setRecentProducts([])
        }

        // Fetch categories for dropdown
        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("id, name")
          .order("name", { ascending: true })

        if (categoryError) {
          console.error("Error fetching categories:", categoryError)
          throw new Error(`Kategoriler yüklenirken hata oluştu: ${categoryError.message}`)
        }

        setCategories(categoryData || [])

        // Fetch user's store
        const { data: storeData, error: storeError } = await supabase
          .from("stores")
          .select("id, name")
          .eq("user_id", user?.id)
          .maybeSingle()

        if (storeError) {
          console.error("Error fetching store:", storeError)
          // Don't throw error, just log it and continue
        } else if (storeData) {
          setStores([storeData])
          setFormData((prev) => ({ ...prev, store_id: storeData.id }))
        } else {
          // No store found for this user
          console.log("No store found for this user")
          setStores([])
        }

        // Fetch variant attributes
        const { data: attributeData, error: attributeError } = await supabase
          .from("variant_attributes")
          .select("id, name, display_name")
          .order("display_name", { ascending: true })

        if (attributeError) {
          console.warn("Variant attributes table may not exist yet:", attributeError)
          setAttributes([])
        } else {
          setAttributes(attributeData || [])
        }
      } catch (error: any) {
        console.error("Error in fetchData:", error)
        toast({
          title: "Hata",
          description: error.message || "Veriler yüklenirken bir hata oluştu.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && user) {
      fetchData()
    }
  }, [authLoading, user, toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    // Auto-generate slug from name if slug field is empty
    if (name === "name" && !formData.slug) {
      const slug = value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
      setFormData({ ...formData, slug })
    }
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: Number.parseFloat(value) })
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value })
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    // Only update the form data if the column exists in the database
    if (name === "is_featured" || name === "has_variants" || name === "is_active") {
      setFormData({ ...formData, [name]: checked })
    } else {
      console.warn(`Column ${name} might not exist in the database`)
      // Still update the form data for UI consistency
      setFormData({ ...formData, [name]: checked })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      price: 0,
      discount_price: 0,
      stock_quantity: 0,
      category_id: "",
      store_id: "",
      is_active: true,
      is_featured: false,
      has_variants: false,
      image_url: "",
    })
  }

  const handleAddProduct = async () => {
    try {
      const {
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
        image_url,
      } = formData

      if (!name || !slug || !price || !store_id || !category_id) {
        toast({
          title: "Hata",
          description: "Ürün adı, slug, fiyat, mağaza ve kategori alanları zorunludur.",
          variant: "destructive",
        })
        return
      }

      const { data, error } = await supabase
        .from("products")
        .insert({
          name,
          slug,
          description,
          price,
          discount_price: discount_price || null,
          stock_quantity,
          category_id,
          store_id,
          is_active,
          is_featured,
          has_variants,
          image_url: image_url || null,
          is_approved: null,
          reject_reason: null,
        })
        .select()

      if (error) throw error

      // Add to recent products
      if (data && data.length > 0) {
        await supabase.from("recent_products").insert({
          product_id: data[0].id,
        })
      }

      toast({
        title: "Başarılı",
        description: "Ürün başarıyla eklendi.",
      })

      // Refresh products
      const { data: newProducts, error: fetchError } = await supabase
        .from("products")
        .select(`
          id, name, slug, description, price, discount_price, stock_quantity, 
          is_active, is_featured, has_variants, created_at, image_url,
          store:store_id(id, name, slug),
          category:category_id(id, name, slug)
        `)
        .order("created_at", { ascending: false })

      if (fetchError) throw fetchError

      setProducts(newProducts || [])
      resetForm()
      setIsAddDialogOpen(false)

      // If product has variants, open the variants dialog
      if (has_variants && data && data.length > 0) {
        setSelectedProduct(data[0])
        setIsVariantsDialogOpen(true)
      }
    } catch (error: any) {
      console.error("Error adding product:", error)
      toast({
        title: "Hata",
        description: error.message || "Ürün eklenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setFormData({
      name: product.name,
      slug: product.slug || "",
      description: product.description || "",
      price: product.price,
      discount_price: product.discount_price || 0,
      stock_quantity: product.stock_quantity || 0,
      category_id: product.category?.id || "",
      store_id: product.store?.id || "",
      is_active: product.is_active,
      is_featured: product.is_featured,
      has_variants: product.has_variants,
      image_url: product.image_url || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateProduct = async () => {
    try {
      const {
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
        image_url,
      } = formData

      if (!name || !slug || !price || !store_id || !category_id) {
        toast({
          title: "Hata",
          description: "Ürün adı, slug, fiyat, mağaza ve kategori alanları zorunludur.",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase
        .from("products")
        .update({
          name,
          slug,
          description,
          price,
          discount_price: discount_price || null,
          stock_quantity,
          category_id,
          store_id,
          is_active,
          is_featured,
          has_variants,
          image_url: image_url || null,
          is_approved: null,
          reject_reason: null,
        })
        .eq("id", selectedProduct.id)

      if (error) throw error

      toast({
        title: "Başarılı",
        description: "Ürün başarıyla güncellendi ve tekrar onaya gönderildi.",
      })

      // Refresh products
      const { data: updatedProducts, error: fetchError } = await supabase
        .from("products")
        .select(`
          id, name, slug, description, price, discount_price, stock_quantity, 
          is_active, is_featured, has_variants, created_at, image_url,
          is_approved, reject_reason,
          store:store_id(id, name, slug),
          category:category_id(id, name, slug)
        `)
        .order("created_at", { ascending: false })

      if (fetchError) throw fetchError

      setProducts(updatedProducts || [])
      resetForm()
      setIsEditDialogOpen(false)
    } catch (error: any) {
      console.error("Error updating product:", error)
      toast({
        title: "Hata",
        description: error.message || "Ürün güncellenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    try {
      setLoading(true)
      console.log("Starting product deletion process for product:", productId)

      // 1. Önce ürünün varyantlarını kontrol et
      const { data: variants, error: variantsError } = await supabase
        .from("product_variants")
        .select("id")
        .eq("product_id", productId)

      if (variantsError) {
        console.error("Error checking variants:", variantsError)
        throw new Error(`Varyantlar kontrol edilirken hata oluştu: ${variantsError.message}`)
      }

      console.log("Found variants:", variants)

      // 2. Varyant değer kombinasyonlarını sil
      if (variants && variants.length > 0) {
        const variantIds = variants.map((v) => v.id)
        console.log("Deleting variant values for variant IDs:", variantIds)

        const { error: variantValueError } = await supabase
          .from("product_variant_values")
          .delete()
          .in("variant_id", variantIds)

        if (variantValueError) {
          console.error("Error deleting variant values:", variantValueError)
          throw new Error(`Varyant değerleri silinirken hata oluştu: ${variantValueError.message}`)
        }
      }

      // 3. Varyant kombinasyonlarını sil
      console.log("Deleting variants for product:", productId)
      const { data: deletedVariants, error: variantError } = await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", productId)
        .select()

      if (variantError) {
        console.error("Error deleting variants:", variantError)
        throw new Error(`Varyantlar silinirken hata oluştu: ${variantError.message}`)
      }

      console.log("Deleted variants:", deletedVariants)

      // 4. Varyant kategorilerini bul ve sil
      console.log("Finding variant categories for product:", productId)
      const { data: categories, error: categoriesError } = await supabase
        .from("variant_categories")
        .select("id")
        .eq("product_id", productId)

      if (categoriesError) {
        console.error("Error checking categories:", categoriesError)
        throw new Error(`Varyant kategorileri kontrol edilirken hata oluştu: ${categoriesError.message}`)
      }

      console.log("Found categories:", categories)

      // 5. Varyant değerlerini sil
      if (categories && categories.length > 0) {
        const categoryIds = categories.map((c) => c.id)
        console.log("Deleting variant values for category IDs:", categoryIds)

        const { error: valueError } = await supabase.from("variant_values").delete().in("category_id", categoryIds)

        if (valueError) {
          console.error("Error deleting variant values:", valueError)
          throw new Error(`Varyant değerleri silinirken hata oluştu: ${valueError.message}`)
        }
      }

      // 6. Varyant kategorilerini sil
      console.log("Deleting variant categories for product:", productId)
      const { data: deletedCategories, error: categoryError } = await supabase
        .from("variant_categories")
        .delete()
        .eq("product_id", productId)
        .select()

      if (categoryError) {
        console.error("Error deleting categories:", categoryError)
        throw new Error(`Varyant kategorileri silinirken hata oluştu: ${categoryError.message}`)
      }

      console.log("Deleted categories:", deletedCategories)

      // 7. Ürün resimlerini sil
      console.log("Deleting product images for product:", productId)
      const { error: imageError } = await supabase.from("product_images").delete().eq("product_id", productId)

      if (imageError) {
        console.error("Error deleting images:", imageError)
        throw new Error(`Ürün resimleri silinirken hata oluştu: ${imageError.message}`)
      }

      // 8. Son olarak ürünü sil
      console.log("Deleting product:", productId)
      const { data: deletedProduct, error: productError } = await supabase
        .from("products")
        .delete()
        .eq("id", productId)
        .select()

      if (productError) {
        console.error("Error deleting product:", productError)
        throw new Error(`Ürün silinirken hata oluştu: ${productError.message}`)
      }

      console.log("Deleted product:", deletedProduct)

      toast({
        title: "Başarılı",
        description: "Ürün ve ilişkili tüm veriler başarıyla silindi.",
      })

      // Listeyi yenile
      await fetchProducts()
      // Anasayfa ve diğer listeler güncellensin
      if (router && typeof router.refresh === "function") {
        router.refresh()
      }
    } catch (error: any) {
      console.error("Error in handleDeleteProduct:", error)
      toast({
        title: "Hata",
        description: error.message || "Ürün silinirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleManageVariants = async (product: Product) => {
    setSelectedProduct(product)

    try {
      // Check if variant_options table exists
      const { data: tableExists, error: tableError } = await supabase
        .rpc("check_table_exists", { table_name: "product_variants" })
        .single()

      if (tableError || !(tableExists && typeof tableExists.exists === "boolean" && tableExists.exists)) {
        toast({
          title: "Varyant Tablosu Bulunamadı",
          description: "Varyant tablosu henüz oluşturulmamış. Lütfen önce veritabanı güncellemesini yapın.",
          variant: "destructive",
        })
        return
      }

      // Fetch variants for this product
      const { data: variantData, error: variantError } = await supabase
        .from("product_variants")
        .select(`
          id, name, sku, price, discount_price, stock_quantity, is_default, image_url
        `)
        .eq("product_id", product.id)
        .order("created_at", { ascending: true })

      if (variantError) throw variantError

      // Try to fetch variant options if the table exists
      try {
        const { data: optionsData } = await supabase
          .from("variant_options")
          .select(`
            id, attribute_id, value, display_value, variant_id
          `)
          .in("variant_id", variantData?.map((v) => v.id) || [])

        // Attach options to variants
        if (optionsData && variantData) {
          const variantsWithOptions = variantData.map((variant) => {
            const options = optionsData.filter((opt) => opt.variant_id === variant.id)
            return {
              ...variant,
              options,
            }
          })
          setVariants(variantsWithOptions)
        } else {
          setVariants(variantData || [])
        }
      } catch (optError) {
        console.warn("Could not fetch variant options:", optError)
        setVariants(variantData || [])
      }

      setIsVariantsDialogOpen(true)
    } catch (error) {
      console.error("Error fetching variants:", error)
      toast({
        title: "Hata",
        description: "Varyantlar yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleVariantInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewVariant({ ...newVariant, [name]: value })
  }

  const handleVariantNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewVariant({ ...newVariant, [name]: Number.parseFloat(value) })
  }

  const handleVariantOptionChange = (attributeId: string, value: string) => {
    setNewVariant({
      ...newVariant,
      options: {
        ...newVariant.options,
        [attributeId]: value,
      },
    })
  }

  const handleAddVariant = async () => {
    try {
      if (!selectedProduct) return

      const { name, sku, price, discountPrice, stockQuantity, isDefault, options } = newVariant

      if (!name || price === 0) {
        toast({
          title: "Hata",
          description: "Varyant adı ve fiyat alanları zorunludur.",
          variant: "destructive",
        })
        return
      }

      // First insert the variant
      const { data: variantData, error: variantError } = await supabase
        .from("product_variants")
        .insert({
          product_id: selectedProduct.id,
          name,
          sku,
          price,
          discount_price: discountPrice || null,
          stock_quantity: stockQuantity,
          is_default: isDefault,
        })
        .select()

      if (variantError) throw variantError

      const variantId = variantData[0].id

      // Then insert the variant options if the table exists
      try {
        if (Object.keys(options).length > 0) {
          const optionsToInsert = Object.entries(options).map(([attributeId, value]) => ({
            variant_id: variantId,
            attribute_id: attributeId,
            value,
            display_value: value,
          }))

          const { error: optionsError } = await supabase.from("variant_options").insert(optionsToInsert)

          if (optionsError) console.warn("Error inserting variant options:", optionsError)
        }
      } catch (optError) {
        console.warn("Could not insert variant options:", optError)
      }

      // If this is the default variant, update the product
      if (isDefault) {
        await supabase.from("products").update({ default_variant_id: variantId }).eq("id", selectedProduct.id)
      }

      toast({
        title: "Başarılı",
        description: "Varyant başarıyla eklendi.",
      })

      // Refresh variants
      const { data: refreshedVariants, error: refreshError } = await supabase
        .from("product_variants")
        .select(`
          id, name, sku, price, discount_price, stock_quantity, is_default, image_url
        `)
        .eq("product_id", selectedProduct.id)
        .order("created_at", { ascending: true })

      if (refreshError) throw refreshError

      // Try to fetch variant options if the table exists
      try {
        const { data: optionsData } = await supabase
          .from("variant_options")
          .select(`
            id, attribute_id, value, display_value, variant_id
          `)
          .in("variant_id", refreshedVariants?.map((v) => v.id) || [])

        // Attach options to variants
        if (optionsData && refreshedVariants) {
          const variantsWithOptions = refreshedVariants.map((variant) => {
            const options = optionsData.filter((opt) => opt.variant_id === variant.id)
            return {
              ...variant,
              options,
            }
          })
          setVariants(variantsWithOptions)
        } else {
          setVariants(refreshedVariants || [])
        }
      } catch (optError) {
        console.warn("Could not fetch variant options:", optError)
        setVariants(refreshedVariants || [])
      }

      // Reset the new variant form
      setNewVariant({
        name: "",
        sku: "",
        price: 0,
        discountPrice: 0,
        stockQuantity: 0,
        isDefault: false,
        options: {},
      })
    } catch (error: any) {
      console.error("Error adding variant:", error)
      toast({
        title: "Hata",
        description: error.message || "Varyant eklenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteVariant = async (variantId: string) => {
    try {
      // First delete any options if they exist
      try {
        await supabase.from("variant_options").delete().eq("variant_id", variantId)
      } catch (optError) {
        console.warn("Could not delete variant options:", optError)
      }

      // Then delete the variant
      const { error } = await supabase.from("product_variants").delete().eq("id", variantId)

      if (error) throw error

      toast({
        title: "Başarılı",
        description: "Varyant başarıyla silindi.",
      })

      // Refresh variants
      const { data: refreshedVariants, error: refreshError } = await supabase
        .from("product_variants")
        .select(`
          id, name, sku, price, discount_price, stock_quantity, is_default, image_url
        `)
        .eq("product_id", selectedProduct.id)
        .order("created_at", { ascending: true })

      if (refreshError) throw refreshError

      // Try to fetch variant options if the table exists
      try {
        const { data: optionsData } = await supabase
          .from("variant_options")
          .select(`
            id, attribute_id, value, display_value, variant_id
          `)
          .in("variant_id", refreshedVariants?.map((v) => v.id) || [])

        // Attach options to variants
        if (optionsData && refreshedVariants) {
          const variantsWithOptions = refreshedVariants.map((variant) => {
            const options = optionsData.filter((opt) => opt.variant_id === variant.id)
            return {
              ...variant,
              options,
            }
          })
          setVariants(variantsWithOptions)
        } else {
          setVariants(refreshedVariants || [])
        }
      } catch (optError) {
        console.warn("Could not fetch variant options:", optError)
        setVariants(refreshedVariants || [])
      }
    } catch (error: any) {
      console.error("Error deleting variant:", error)
      toast({
        title: "Hata",
        description: error.message || "Varyant silinirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleSetDefaultVariant = async (variantId: string) => {
    try {
      // Update all variants to not be default
      await supabase.from("product_variants").update({ is_default: false }).eq("product_id", selectedProduct.id)

      // Set the selected variant as default
      await supabase.from("product_variants").update({ is_default: true }).eq("id", variantId)

      // Update the product's default variant
      await supabase.from("products").update({ default_variant_id: variantId }).eq("id", selectedProduct.id)

      toast({
        title: "Başarılı",
        description: "Varsayılan varyant güncellendi.",
      })

      // Refresh variants
      const { data: refreshedVariants, error: refreshError } = await supabase
        .from("product_variants")
        .select(`
          id, name, sku, price, discount_price, stock_quantity, is_default, image_url
        `)
        .eq("product_id", selectedProduct.id)
        .order("created_at", { ascending: true })

      if (refreshError) throw refreshError

      // Try to fetch variant options if the table exists
      try {
        const { data: optionsData } = await supabase
          .from("variant_options")
          .select(`
            id, attribute_id, value, display_value, variant_id
          `)
          .in("variant_id", refreshedVariants?.map((v) => v.id) || [])

        // Attach options to variants
        if (optionsData && refreshedVariants) {
          const variantsWithOptions = refreshedVariants.map((variant) => {
            const options = optionsData.filter((opt) => opt.variant_id === variant.id)
            return {
              ...variant,
              options,
            }
          })
          setVariants(variantsWithOptions)
        } else {
          setVariants(refreshedVariants || [])
        }
      } catch (optError) {
        console.warn("Could not fetch variant options:", optError)
        setVariants(refreshedVariants || [])
      }
    } catch (error: any) {
      console.error("Error setting default variant:", error)
      toast({
        title: "Hata",
        description: error.message || "Varsayılan varyant güncellenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleApproveProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({
          is_approved: true,
          is_active: true,
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .eq("id", id)
      if (error) throw error
      toast({ title: "Başarılı", description: "Ürün onaylandı." })
      // Refresh products
      const { data: updatedProducts, error: fetchError } = await supabase
        .from("products")
        .select(`
          id, name, slug, description, price, discount_price, stock_quantity, 
          is_active, is_featured, has_variants, created_at, image_url,
          is_approved, reject_reason,
          store:store_id(id, name, slug),
          category:category_id(id, name, slug)
        `)
        .order("created_at", { ascending: false })
      if (fetchError) throw fetchError
      setProducts(updatedProducts || [])
    } catch (error: any) {
      toast({ title: "Hata", description: error.message || "Onay işlemi başarısız.", variant: "destructive" })
    }
  }

  const openRejectModal = (id: string) => {
    setRejectReason("")
    setRejectModal({ open: true, product: products.find((p) => p.id === id) })
  }

  const handleRejectProduct = async () => {
    if (!rejectModal.product || !rejectReason) return
    setActionLoading(rejectModal.product.id)
    const { error } = await supabase
      .from("products")
      .update({ is_approved: false, reject_reason: rejectReason })
      .eq("id", rejectModal.product.id)
    if (!error) {
      toast({ title: "Başarılı", description: "Ürün reddedildi." })
      await supabase.from("notifications").insert({
        user_id: getProductOwnerId(rejectModal.product.id),
        type: "product_rejected",
        message: `Ürününüz reddedildi. Sebep: ${rejectReason}`,
        product_id: rejectModal.product.id,
      })
    } else {
      toast({ title: "Hata", description: error.message, variant: "destructive" })
    }
    setActionLoading(null)
    setRejectModal({ open: false })
    setRejectReason("")
    fetchProducts()
  }

  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const filteredProducts = products.filter((product) => {
    if (tab === "new") {
      return (
        product.is_approved === null &&
        (!product.reject_reason || product.reject_reason === "") &&
        new Date(product.created_at) > oneDayAgo
      )
    }
    if (tab === "pending") return product.is_approved === null
    if (tab === "approved") return product.is_approved === true
    if (tab === "rejected") return product.is_approved === false && !!product.reject_reason
    return true
  })

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Yükleniyor...</p>
      </div>
    )
  }

  if (!user || user.role !== "admin") {
    return null
  }

  const sidebarItems = [
    { icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard", href: "/admin/dashboard" },
    { icon: <Users className="h-5 w-5" />, label: "Kullanıcılar", href: "/admin/users" },
    { icon: <Store className="h-5 w-5" />, label: "Mağazalar", href: "/admin/stores" },
    { icon: <ShoppingBag className="h-5 w-5" />, label: "Ürünler", href: "/admin/products" },
    { icon: <Tag className="h-5 w-5" />, label: "Kategoriler", href: "/admin/categories" },
    { icon: <Bell className="h-5 w-5" />, label: "Duyurular", href: "/admin/panel/duyurular" },
    { icon: <AlertCircle className="h-5 w-5" />, label: "Satıcı Başvuruları", href: "/admin/panel/satici-basvurulari" },
    { icon: <FileText className="h-5 w-5" />, label: "Siparişler", href: "/admin/orders" },
    { icon: <Database className="h-5 w-5" />, label: "Veritabanı", href: "/admin/database" },
    { icon: <Settings className="h-5 w-5" />, label: "Ayarlar", href: "/admin/settings" },
  ]

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-2 space-y-1">
            {sidebarItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                  router.pathname === item.href
                    ? "bg-gray-100 dark:bg-gray-700 text-primary"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => router.push("/auth/logout")}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Çıkış Yap
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <div className="p-4 border-b flex items-center justify-between">
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="px-2 space-y-1">
              {sidebarItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                    router.pathname === item.href
                      ? "bg-gray-100 dark:bg-gray-700 text-primary"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                </a>
              ))}
            </nav>
          </div>
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                router.push("/auth/logout")
                setIsMobileMenuOpen(false)
              }}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Çıkış Yap
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-gray-800 border-b p-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Ürünler</h1>
          <div className="w-6"></div> {/* Spacer for alignment */}
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Ürün Yönetimi</h1>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Yeni Ürün
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Yeni Ürün Ekle</DialogTitle>
                    <DialogDescription>Yeni bir ürün eklemek için aşağıdaki formu doldurun.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Ürün Adı</Label>
                        <Input id="name" name="name" value={formData.name} onChange={handleInputChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="slug">Slug</Label>
                        <Input id="slug" name="slug" value={formData.slug} onChange={handleInputChange} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Açıklama</Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price">Fiyat (₺)</Label>
                        <Input
                          id="price"
                          name="price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.price}
                          onChange={handleNumberChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="discount_price">İndirimli Fiyat (₺)</Label>
                        <Input
                          id="discount_price"
                          name="discount_price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.discount_price}
                          onChange={handleNumberChange}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="stock_quantity">Stok</Label>
                        <Input
                          id="stock_quantity"
                          name="stock_quantity"
                          type="number"
                          min="0"
                          step="1"
                          value={formData.stock_quantity}
                          onChange={handleNumberChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="image_url">Resim URL</Label>
                        <Input
                          id="image_url"
                          name="image_url"
                          value={formData.image_url}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category_id">Kategori</Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) => handleSelectChange("category_id", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Kategori seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="is_active"
                          checked={formData.is_active}
                          onChange={(e) => handleCheckboxChange("is_active", e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="is_active">Aktif</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="is_featured"
                          checked={formData.is_featured}
                          onChange={(e) => handleCheckboxChange("is_featured", e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="is_featured">Öne Çıkan</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="has_variants"
                          checked={formData.has_variants}
                          onChange={(e) => handleCheckboxChange("has_variants", e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="has_variants">Varyantlı Ürün</Label>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      İptal
                    </Button>
                    <Button onClick={handleAddProduct}>Ekle</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Recently Added Products Section */}
            {recentProducts.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Son Eklenen Ürünler</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentProducts.map((product) => (
                    <Card key={product.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{product.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {product.store?.name} - {product.category?.name}
                            </p>
                            <p className="text-lg font-semibold text-primary mt-2">
                              {product.price.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                            </p>
                          </div>
                          {product.image_url && (
                            <img
                              src={product.image_url || "/placeholder.svg"}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Ürünler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <button
                    className={`px-4 py-2 rounded font-medium border ${tab === "new" ? "bg-black text-white" : "bg-white text-black border-gray-300"}`}
                    onClick={() => setTab("new")}
                  >
                    Yeni Gelenler (1 Gün)
                  </button>
                  <button
                    className={`px-4 py-2 rounded font-medium border ${tab === "pending" ? "bg-black text-white" : "bg-white text-black border-gray-300"}`}
                    onClick={() => setTab("pending")}
                  >
                    Onay Bekleyenler
                  </button>
                  <button
                    className={`px-4 py-2 rounded font-medium border ${tab === "approved" ? "bg-black text-white" : "bg-white text-black border-gray-300"}`}
                    onClick={() => setTab("approved")}
                  >
                    Onaylananlar
                  </button>
                  <button
                    className={`px-4 py-2 rounded font-medium border ${tab === "rejected" ? "bg-black text-white" : "bg-white text-black border-gray-300"}`}
                    onClick={() => setTab("rejected")}
                  >
                    Reddedilenler
                  </button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün</TableHead>
                      <TableHead>Mağaza</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Fiyat</TableHead>
                      <TableHead>Stok</TableHead>
                      <TableHead>Onay</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="h-10 w-10 relative rounded overflow-hidden bg-gray-100">
                                {product.image_url ? (
                                  <Image
                                    src={product.image_url || "/placeholder.svg"}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                                    <ShoppingBag className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-muted-foreground">{product.slug || "-"}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{product.store_name || "-"}</TableCell>
                          <TableCell>{product.category_name || "-"}</TableCell>
                          <TableCell>
                            {product.discount_price ? (
                              <div>
                                <span className="font-medium">{product.discount_price.toLocaleString("tr-TR")} ₺</span>
                                <span className="ml-1 text-sm text-muted-foreground line-through">
                                  {product.price.toLocaleString("tr-TR")} ₺
                                </span>
                              </div>
                            ) : (
                              <span>{product.price.toLocaleString("tr-TR")} ₺</span>
                            )}
                          </TableCell>
                          <TableCell>{product.stock_quantity}</TableCell>
                          <TableCell>
                            {(tab === "new" || tab === "pending") && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleApproveProduct(product.id)}>
                                  Onayla
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setRejectModal({ open: true, product })}
                                >
                                  Reddet
                                </Button>
                              </>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${product.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                              >
                                {product.is_active ? "Aktif" : "Pasif"}
                              </span>
                              {product.is_featured && (
                                <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 flex items-center">
                                  <Star className="h-3 w-3 mr-1" />
                                  Öne Çıkan
                                </span>
                              )}
                              {product.has_variants && (
                                <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 flex items-center">
                                  <Copy className="h-3 w-3 mr-1" />
                                  Varyantlı
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Düzenle
                                </DropdownMenuItem>
                                {product.has_variants && (
                                  <DropdownMenuItem onClick={() => handleManageVariants(product)}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Varyantları Yönet
                                  </DropdownMenuItem>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <Trash className="mr-2 h-4 w-4" />
                                      Sil
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Ürünü Sil</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>İptal</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteProduct(product.id)}
                                        className="bg-red-500 hover:bg-red-600"
                                      >
                                        Sil
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          Henüz ürün bulunmuyor.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Ürün Düzenle</DialogTitle>
            <DialogDescription>Ürün bilgilerini düzenlemek için aşağıdaki formu kullanın.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Ürün Adı</Label>
                <Input id="edit-name" name="name" value={formData.name} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slug">Slug</Label>
                <Input id="edit-slug" name="slug" value={formData.slug} onChange={handleInputChange} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Açıklama</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Fiyat (₺)</Label>
                <Input
                  id="edit-price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleNumberChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-discount_price">İndirimli Fiyat (₺)</Label>
                <Input
                  id="edit-discount_price"
                  name="discount_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discount_price}
                  onChange={handleNumberChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-stock_quantity">Stok</Label>
                <Input
                  id="edit-stock_quantity"
                  name="stock_quantity"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.stock_quantity}
                  onChange={handleNumberChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-image_url">Resim URL</Label>
                <Input id="edit-image_url" name="image_url" value={formData.image_url} onChange={handleInputChange} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category_id">Kategori</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => handleSelectChange("category_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-store_id">Mağaza</Label>
                <Select value={formData.store_id} onValueChange={(value) => handleSelectChange("store_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mağaza seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-is_active"
                  checked={formData.is_active}
                  onChange={(e) => handleCheckboxChange("is_active", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="edit-is_active">Aktif</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-is_featured"
                  checked={formData.is_featured}
                  onChange={(e) => handleCheckboxChange("is_featured", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="edit-is_featured">Öne Çıkan</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-has_variants"
                  checked={formData.has_variants}
                  onChange={(e) => handleCheckboxChange("has_variants", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="edit-has_variants">Varyantlı Ürün</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleUpdateProduct}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variants Dialog */}
      <Dialog open={isVariantsDialogOpen} onOpenChange={setIsVariantsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Varyant Yönetimi</DialogTitle>
            <DialogDescription>{selectedProduct?.name} ürünü için varyantları yönetin.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="border rounded-md p-4">
              <h3 className="text-lg font-medium mb-4">Yeni Varyant Ekle</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="variant-name">Varyant Adı</Label>
                  <Input
                    id="variant-name"
                    name="name"
                    value={newVariant.name}
                    onChange={handleVariantInputChange}
                    placeholder="Örn: Kırmızı, XL, vb."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="variant-sku">SKU</Label>
                  <Input
                    id="variant-sku"
                    name="sku"
                    value={newVariant.sku}
                    onChange={handleVariantInputChange}
                    placeholder="Stok Kodu"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="variant-price">Fiyat (₺)</Label>
                  <Input
                    id="variant-price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newVariant.price}
                    onChange={handleVariantNumberChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="variant-discount_price">İndirimli Fiyat (₺)</Label>
                  <Input
                    id="variant-discount_price"
                    name="discountPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newVariant.discountPrice}
                    onChange={handleVariantNumberChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="variant-stock_quantity">Stok</Label>
                  <Input
                    id="variant-stock_quantity"
                    name="stockQuantity"
                    type="number"
                    min="0"
                    step="1"
                    value={newVariant.stockQuantity}
                    onChange={handleVariantNumberChange}
                  />
                </div>
              </div>
              {attributes.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Varyant Özellikleri</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {attributes.map((attribute) => (
                      <div key={attribute.id} className="space-y-2">
                        <Label htmlFor={`attribute-${attribute.id}`}>{attribute.display_name}</Label>
                        <Input
                          id={`attribute-${attribute.id}`}
                          value={newVariant.options[attribute.id] || ""}
                          onChange={(e) => handleVariantOptionChange(attribute.id, e.target.value)}
                          placeholder={`${attribute.display_name} değeri`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-2 mt-4">
                <input
                  type="checkbox"
                  id="variant-isDefault"
                  checked={newVariant.isDefault}
                  onChange={(e) => setNewVariant({ ...newVariant, isDefault: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="variant-isDefault">Varsayılan Varyant</Label>
              </div>
              <div className="mt-4">
                <Button onClick={handleAddVariant}>Varyant Ekle</Button>
              </div>
            </div>

            <div className="border rounded-md p-4">
              <h3 className="text-lg font-medium mb-4">Mevcut Varyantlar</h3>
              {variants.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Varyant</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Fiyat</TableHead>
                      <TableHead>Stok</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{variant.name}</div>
                            {variant.options && variant.options.length > 0 && (
                              <div className="text-sm text-muted-foreground">
                                {variant.options
                                  .map((opt: any) => `${opt.variant_attributes?.display_name}: ${opt.value}`)
                                  .join(", ")}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{variant.sku || "-"}</TableCell>
                        <TableCell>
                          {variant.discount_price ? (
                            <div>
                              <span className="font-medium">{variant.discount_price.toLocaleString("tr-TR")} ₺</span>
                              <span className="ml-1 text-sm text-muted-foreground line-through">
                                {variant.price.toLocaleString("tr-TR")} ₺
                              </span>
                            </div>
                          ) : (
                            <span>{variant.price.toLocaleString("tr-TR")} ₺</span>
                          )}
                        </TableCell>
                        <TableCell>{variant.stock_quantity}</TableCell>
                        <TableCell>
                          {variant.is_default && (
                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              Varsayılan
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            {!variant.is_default && (
                              <Button variant="outline" size="sm" onClick={() => handleSetDefaultVariant(variant.id)}>
                                Varsayılan Yap
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Varyantı Sil</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Bu varyantı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>İptal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteVariant(variant.id)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Sil
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Henüz varyant bulunmuyor. Yukarıdaki formu kullanarak varyant ekleyebilirsiniz.
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVariantsDialogOpen(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reddetme Modalı */}
      {rejectModal.open && rejectModal.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-2">Red Sebebi Girin</h2>
            <textarea
              className="w-full border rounded p-2 mb-3"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Red sebebini yazın..."
            />
            <div className="flex gap-2 justify-end">
              <button
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium disabled:opacity-60"
                onClick={() => handleRejectProduct()}
                disabled={!rejectReason || !!actionLoading}
              >
                {actionLoading === rejectModal.product.id ? "Reddediliyor..." : "Reddet"}
              </button>
              <button
                className="bg-gray-200 hover:bg-gray-300 text-black px-4 py-2 rounded font-medium"
                onClick={() => {
                  setRejectModal({ open: false })
                  setRejectReason("")
                }}
                disabled={!!actionLoading}
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Yardımcı fonksiyonlar (örnek, gerçek uygulamada context veya props ile alınmalı)
function isAdmin() {
  return true
}
function getProductOwnerId(productId: string) {
  return "user_id"
}
