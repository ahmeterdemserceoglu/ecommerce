"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu" // Added DropdownMenuSeparator
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  // AlertDialogTrigger, // Likely not needed if triggered programmatically or via Dropdown
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
// import { Sheet, SheetContent } from "@/components/ui/sheet" // Handled by AdminLayout
// import { useAuth } from "@/hooks/use-auth" // Handled by AdminLayout
import {
  // LayoutDashboard, // From AdminLayout
  // LogOut, // From AdminLayout
  // Menu, // From AdminLayout
  MoreHorizontal,
  Plus,
  // Settings, // From AdminLayout
  // Store, // From AdminLayout (icon only)
  // Tag, // From AdminLayout (icon only)
  Trash,
  // Users, // From AdminLayout
  // X, // From AdminLayout
  Edit,
  // FileText, // From AdminLayout
  // Database, // From AdminLayout
  // Bell, // From AdminLayout
  AlertCircle, // Added AlertCircle import
  ShoppingBag, // Keep for product specific UI if needed, or remove if icon comes from layout only
  Star,
  Copy,
  Eye, // Added for view action
  CheckCircle, // For approve
  XCircle, // For reject
  Loader2, // Added
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import AdminLayout from "@/components/admin/AdminLayout" // Import AdminLayout
import { formatPrice, formatDate, slugify } from "@/lib/utils" // Added slugify, changed formatCurrency to formatPrice
// import { revalidatePath } from "next/cache" // No longer needed here
import {
  approveProductAction,
  rejectProductAction,
  deleteProductAction,
  reevaluateProductAction, // Import reevaluateProductAction
} from "@/app/actions/adminProductActions" // Import Server Actions

// Ürün tipi
interface Product {
  id: string
  name: string
  slug?: string
  description?: string
  price: number
  discount_price?: number | null
  stock_quantity: number
  is_active: boolean
  is_featured?: boolean
  has_variants?: boolean
  created_at: string
  image_url?: string | null
  approved?: boolean | null
  rejected?: boolean | null
  reject_reason?: string | null
  store_id?: string | null
  category_id?: string | null
  store?: { id: string; name: string; slug?: string }
  category?: { id: string; name: string; slug?: string }
  store_name?: string
  category_name?: string
  user_id?: string | null
  submitted_at?: string | null
  approved_at?: string | null
  approved_by?: string | null
  rejected_at?: string | null
  rejected_by?: string | null
}

type Tab = "all" | "new" | "pending" | "approved" | "rejected"

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Tüm Ürünler" },
  { key: "new", label: "Yeni Gelenler (24 Saat)" },
  { key: "pending", label: "Onay Bekleyenler" },
  { key: "approved", label: "Onaylananlar" },
  { key: "rejected", label: "Reddedilenler" },
]

export default function AdminProductsPage() {
  const router = useRouter()
  // const { user, loading: authLoading } = useAuth() // Handled by AdminLayout
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  // const [attributes, setAttributes] = useState<any[]>([]) // Not used in provided snippet, remove if still unused
  // const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false) // Handled by AdminLayout
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  // const [isVariantsDialogOpen, setIsVariantsDialogOpen] = useState(false) // Not used
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  // const [variants, setVariants] = useState<any[]>([]) // Not used
  // const [newVariant, setNewVariant] = useState({ // Not used
  // name: \"\",
  // sku: \"\",
  // price: 0,
  // discountPrice: 0,
  // stockQuantity: 0,
  // isDefault: false,
  // options: {} as Record<string, string>,
  // })
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    slug: "",
    description: "",
    price: 0,
    discount_price: null,
    stock_quantity: 0,
    category_id: null,
    store_id: null,
    is_active: true,
    is_featured: false,
    has_variants: false,
    image_url: null,
    approved: null,
    rejected: false,
  })
  const [currentTab, setCurrentTab] = useState<Tab>("all")
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [productToReject, setProductToReject] = useState<Product | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({}) // For specific product actions

  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [storeFilter, setStoreFilter] = useState("")
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const debounce = (func: Function, delay: number) => {
    let timeout: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), delay)
    }
  }

  const debouncedSetSearchTerm = useCallback(debounce(setDebouncedSearchTerm, 500), [])

  useEffect(() => {
    debouncedSetSearchTerm(searchTerm)
  }, [searchTerm, debouncedSetSearchTerm])


  const fetchInitialData = useCallback(async () => {
    console.log("DEBUG: fetchInitialData CALLED"); // Log when function is called
    setLoading(true)
    try {
      const [productsRes, categoriesRes, storesRes] = await Promise.all([
        supabase
          .from("products")
          .select(`
          id, name, slug, description, price, discount_price, stock_quantity, 
          is_active, is_featured, has_variants, created_at, image_url,
            approved, rejected, reject_reason, user_id, submitted_at, approved_at, approved_by, rejected_at, rejected_by,
          store:store_id(id, name, slug),
          category:category_id(id, name, slug)
        `)
          .order("created_at", { ascending: false }),
        supabase.from("categories").select("id, name").order("name"),
        supabase.from("stores").select("id, name").order("name")
      ])

      if (productsRes.error) throw productsRes.error
      if (categoriesRes.error) throw categoriesRes.error
      if (storesRes.error) throw storesRes.error

      const productsWithSignedUrls = await Promise.all(
        (productsRes.data || []).map(async (p: any) => {
          let signedImageUrl = p.image_url;
          if (p.image_url && !p.image_url.startsWith('http')) {
            const { data, error } = await supabase.storage.from('images').createSignedUrl(p.image_url, 3600); // 1 hour expiry, CHANGED BUCKET
            if (error) {
              console.warn(`Failed to sign URL for ${p.image_url}:`, error.message);
            } else {
              signedImageUrl = data.signedUrl;
            }
          }
          return {
            ...p,
            image_url: signedImageUrl,
            store_name: p.store?.name,
            category_name: p.category?.name,
          };
        })
      );

      setProducts(productsWithSignedUrls as Product[]);
      setCategories(categoriesRes.data || [])
      setStores(storesRes.data || [])

    } catch (error: any) {
      console.error("Error fetching initial data:", error)
      toast({
        title: "Veri Yükleme Hatası",
        description: error.message || "Veriler yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    // Auth is handled by AdminLayout, so we can directly fetch data
    fetchInitialData()
  }, [fetchInitialData])

  useEffect(() => {
    let processedProducts = products

    // Filter by search term
    if (debouncedSearchTerm) {
      processedProducts = processedProducts.filter(p =>
        p.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
      )
    }

    // Filter by category
    if (categoryFilter) {
      processedProducts = processedProducts.filter(p => p.category?.id === categoryFilter)
    }

    // Filter by store
    if (storeFilter) {
      processedProducts = processedProducts.filter(p => p.store?.id === storeFilter)
    }

    // Filter by tab
    switch (currentTab) {
      case "new":
        const oneDayAgo = new Date()
        oneDayAgo.setDate(oneDayAgo.getDate() - 1)
        processedProducts = processedProducts.filter(p =>
          new Date(p.created_at) > oneDayAgo &&
          (p.approved === null || p.approved === false) &&
          !p.rejected
        )
        break
      case "pending":
        processedProducts = processedProducts.filter(p =>
          (p.approved === null || p.approved === false) &&
          !p.rejected
        )
        break
      case "approved":
        processedProducts = processedProducts.filter(p => p.approved === true)
        break
      case "rejected":
        processedProducts = processedProducts.filter(p => p.rejected === true)
        break
      case "all":
      default:
        // No additional tab-based filtering for "all"
        break
    }
    setFilteredProducts(processedProducts)
    setCurrentPage(1) // Reset to first page on filter change
  }, [products, currentTab, debouncedSearchTerm, categoryFilter, storeFilter])

  // Log filteredProducts before pagination
  console.log("DEBUG: filteredProducts length:", filteredProducts.length);
  // console.log("DEBUG: filteredProducts content (first 3 for brevity):", JSON.stringify(filteredProducts.slice(0, 3).map(p => ({ name: p.name, approved: p.approved, rejected: p.rejected, image_url: p.image_url, created_at: p.created_at }))));

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Log paginatedProducts that will be mapped
  console.log("DEBUG: paginatedProducts length:", paginatedProducts.length);
  // console.log("DEBUG: paginatedProducts content to be mapped (first 3 for brevity):", JSON.stringify(paginatedProducts.slice(0, 3).map(p => ({ name: p.name, approved: p.approved, rejected: p.rejected, image_url: p.image_url, created_at: p.created_at }))));

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (name === 'name' && (isAddDialogOpen || (isEditDialogOpen && selectedProduct && formData.slug === slugify(selectedProduct.name)))) {
      setFormData(prev => ({ ...prev, slug: slugify(value) }))
    }
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value === '' ? null : parseFloat(value) }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (name: keyof Product, checked: boolean) => { // Use keyof Product
    setFormData(prev => ({ ...prev, [name]: checked }))
  }

  const resetForm = () => {
    setFormData({
      name: "", slug: "", description: "", price: 0, discount_price: null,
      stock_quantity: 0, category_id: null, store_id: null,
      is_active: true, is_featured: false, has_variants: false, image_url: null,
      approved: null, rejected: false,
    })
  }

  const handleOpenAddDialog = () => {
    resetForm()
    setIsAddDialogOpen(true)
  }

  const handleAddProduct = async () => {
    if (!formData.name || formData.price == null || formData.stock_quantity == null || !formData.category_id || !formData.store_id) {
      toast({ title: "Eksik Bilgi", description: "Lütfen tüm zorunlu alanları doldurun.", variant: "destructive" })
      return
    }
    setActionLoading(prev => ({ ...prev, add: true }))
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const productDataToInsert = {
        name: formData.name!,
        slug: formData.slug || slugify(formData.name!),
        description: formData.description,
        price: formData.price!,
        discount_price: formData.discount_price,
        stock_quantity: formData.stock_quantity!,
        is_active: formData.is_active === undefined ? true : formData.is_active, // Ensure boolean
        is_featured: formData.is_featured === undefined ? false : formData.is_featured, // Ensure boolean
        has_variants: formData.has_variants === undefined ? false : formData.has_variants, // Ensure boolean
        image_url: formData.image_url, // Path to image, will be signed on fetch
        approved: null,
        rejected: false,
        reject_reason: null,
        store_id: formData.store_id,
        category_id: formData.category_id,
        user_id: user?.id,
        submitted_at: new Date().toISOString(),
        approved_at: null,
        approved_by: null,
        rejected_at: null,
        rejected_by: null,
      } satisfies Partial<Product> & { user_id?: string | null; name: string; price: number; stock_quantity: number; store_id: string; category_id: string } // More specific type for insert
      // ^^^ The 'satisfies' keyword helps ensure the object matches a structure without full typing from DB schema immediately

      const { data: newProductData, error } = await supabase
        .from("products")
        .insert(productDataToInsert as any)
        .select(`
          id, name, slug, description, price, discount_price, stock_quantity, 
          is_active, is_featured, has_variants, created_at, image_url,
          approved, rejected, reject_reason, user_id, submitted_at, approved_at, approved_by, rejected_at, rejected_by,
          store:store_id(id, name, slug),
          category:category_id(id, name, slug)
        `)
        .single()

      if (error) throw error
      if (!newProductData || ('error' in newProductData && newProductData.error)) {
        throw new Error((newProductData as any)?.error?.message || "Product creation failed to return data or returned an error.");
      }

      // Safely access properties and prepare for image signing
      const imageUrlFromDb = typeof (newProductData as any)?.image_url === 'string' ? (newProductData as any).image_url : null;
      let signedImageUrl = imageUrlFromDb;

      if (imageUrlFromDb && !imageUrlFromDb.startsWith('http')) {
        const { data: signedUrlData, error: signError } = await supabase.storage.from('images').createSignedUrl(imageUrlFromDb, 3600);
        if (signError) {
          console.warn(`Failed to sign URL for new product ${imageUrlFromDb}:`, signError.message);
        } else {
          signedImageUrl = signedUrlData.signedUrl;
        }
      }

      const productStore = (newProductData as any)?.store;
      const productCategory = (newProductData as any)?.category;

      const newProductWithDetails: Product = {
        id: (newProductData as any).id || '', // Fallback to empty string if id is missing
        name: (newProductData as any).name || 'Unnamed Product', // Fallback
        slug: (newProductData as any).slug,
        description: (newProductData as any).description,
        price: (newProductData as any).price ?? 0,
        discount_price: (newProductData as any).discount_price,
        stock_quantity: (newProductData as any).stock_quantity ?? 0,
        is_active: (newProductData as any).is_active ?? true,
        is_featured: (newProductData as any).is_featured ?? false,
        has_variants: (newProductData as any).has_variants ?? false,
        created_at: (newProductData as any).created_at || new Date().toISOString(),
        image_url: signedImageUrl,
        approved: (newProductData as any).approved,
        rejected: (newProductData as any).rejected,
        reject_reason: (newProductData as any).reject_reason,
        store_id: (newProductData as any).store_id,
        category_id: (newProductData as any).category_id,
        user_id: (newProductData as any).user_id,
        submitted_at: (newProductData as any).submitted_at,
        approved_at: (newProductData as any).approved_at,
        approved_by: (newProductData as any).approved_by,
        rejected_at: (newProductData as any).rejected_at,
        rejected_by: (newProductData as any).rejected_by,
        store: productStore ? { id: productStore.id || '', name: productStore.name || 'Unknown Store', slug: productStore.slug } : undefined,
        category: productCategory ? { id: productCategory.id || '', name: productCategory.name || 'Unknown Category', slug: productCategory.slug } : undefined,
        store_name: productStore?.name || 'Unknown Store',
        category_name: productCategory?.name || 'Unknown Category',
      };

      // Ensure essential fields that Product type expects are present, even if with fallbacks
      if (!newProductWithDetails.id) {
        console.warn("New product data missing ID after creation:", newProductData);
        // Potentially skip adding to list or throw more specific error
        return;
      }


      setProducts(prev => [newProductWithDetails, ...prev])
      setIsAddDialogOpen(false)
      resetForm()
      toast({ title: "Başarılı", description: "Ürün başarıyla eklendi." })
      if (newProductWithDetails.store?.slug) {
        // revalidatePath(`/magaza/${newProductWithDetails.store.slug}`)
      }
      if (newProductWithDetails.slug) {
        // revalidatePath(`/urun/${newProductWithDetails.slug}`)
      }
    } catch (error: any) {
      toast({ title: "Hata", description: `Ürün eklenirken hata: ${error.message}`, variant: "destructive" })
    } finally {
      setActionLoading(prev => ({ ...prev, add: false }))
    }
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setFormData({
      ...product,
      price: product.price ?? 0,
      stock_quantity: product.stock_quantity ?? 0,
      discount_price: product.discount_price ?? null,
      image_url: product.image_url ?? null,
      category_id: product.category_id ?? null,
      store_id: product.store_id ?? null,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateProduct = async () => {
    if (!selectedProduct || !formData.name || formData.price == null || formData.stock_quantity == null || !formData.category_id || !formData.store_id) {
      toast({ title: "Eksik Bilgi", description: "Lütfen tüm zorunlu alanları doldurun.", variant: "destructive" })
      return
    }
    setActionLoading(prev => ({ ...prev, [selectedProduct.id]: true }))
    try {
      // Construct only the fields that can be updated by the user from the form
      const updateData = {
        name: formData.name,
        slug: formData.slug || slugify(formData.name!),
        description: formData.description,
        price: formData.price,
        discount_price: formData.discount_price,
        stock_quantity: formData.stock_quantity,
        is_active: formData.is_active === undefined ? selectedProduct?.is_active : formData.is_active,
        is_featured: formData.is_featured === undefined ? selectedProduct?.is_featured : formData.is_featured,
        has_variants: formData.has_variants === undefined ? selectedProduct?.has_variants : formData.has_variants,
        image_url: formData.image_url, // Path to image, will be signed on next fetch
        category_id: formData.category_id,
        store_id: formData.store_id,
      } satisfies Partial<Product>; // More specific type for update

      const { data: updatedProductData, error } = await supabase
        .from("products")
        .update(updateData as any)
        .eq("id", selectedProduct.id as any)
        .select(`
          id, name, slug, description, price, discount_price, stock_quantity, 
          is_active, is_featured, has_variants, created_at, image_url,
          approved, rejected, reject_reason, user_id, submitted_at, approved_at, approved_by, rejected_at, rejected_by,
          store:store_id(id, name, slug),
          category:category_id(id, name, slug)
        `)
        .single()

      if (error) throw error
      if (!updatedProductData || ('error' in updatedProductData && updatedProductData.error)) {
        throw new Error((updatedProductData as any)?.error?.message || "Product update failed to return data or returned an error.");
      }

      const imageUrlFromDbUpdate = typeof (updatedProductData as any)?.image_url === 'string' ? (updatedProductData as any).image_url : null;
      let signedImageUrlUpdate = imageUrlFromDbUpdate;

      if (imageUrlFromDbUpdate && !imageUrlFromDbUpdate.startsWith('http')) {
        const { data: signedUrlData, error: signError } = await supabase.storage.from('images').createSignedUrl(imageUrlFromDbUpdate, 3600);
        if (signError) {
          console.warn(`Failed to sign URL for updated product ${imageUrlFromDbUpdate}:`, signError.message);
        } else {
          signedImageUrlUpdate = signedUrlData.signedUrl;
        }
      }

      const productStoreUpdate = (updatedProductData as any)?.store;
      const productCategoryUpdate = (updatedProductData as any)?.category;

      const updatedProductWithDetails: Product = {
        id: (updatedProductData as any).id,
        name: (updatedProductData as any).name,
        slug: (updatedProductData as any).slug,
        description: (updatedProductData as any).description,
        price: (updatedProductData as any).price ?? 0,
        discount_price: (updatedProductData as any).discount_price,
        stock_quantity: (updatedProductData as any).stock_quantity ?? 0,
        is_active: (updatedProductData as any).is_active ?? true,
        is_featured: (updatedProductData as any).is_featured ?? false,
        has_variants: (updatedProductData as any).has_variants ?? false,
        created_at: (updatedProductData as any).created_at,
        image_url: signedImageUrlUpdate,
        approved: (updatedProductData as any).approved,
        rejected: (updatedProductData as any).rejected,
        reject_reason: (updatedProductData as any).reject_reason,
        store_id: (updatedProductData as any).store_id,
        category_id: (updatedProductData as any).category_id,
        user_id: (updatedProductData as any).user_id,
        submitted_at: (updatedProductData as any).submitted_at,
        approved_at: (updatedProductData as any).approved_at,
        approved_by: (updatedProductData as any).approved_by,
        rejected_at: (updatedProductData as any).rejected_at,
        rejected_by: (updatedProductData as any).rejected_by,
        store: productStoreUpdate ? { id: productStoreUpdate.id || '', name: productStoreUpdate.name || 'Unknown Store', slug: productStoreUpdate.slug } : undefined,
        category: productCategoryUpdate ? { id: productCategoryUpdate.id || '', name: productCategoryUpdate.name || 'Unknown Category', slug: productCategoryUpdate.slug } : undefined,
        store_name: productStoreUpdate?.name || 'Unknown Store',
        category_name: productCategoryUpdate?.name || 'Unknown Category',
      };

      setProducts(prev => prev.map(p => (p.id === selectedProduct.id ? updatedProductWithDetails : p)))
      setIsEditDialogOpen(false)
      toast({ title: "Başarılı", description: "Ürün başarıyla güncellendi." })
    } catch (error: any) {
      toast({ title: "Hata", description: `Ürün güncellenirken hata: ${error.message}`, variant: "destructive" })
    } finally {
      if (selectedProduct?.id) {
        setActionLoading(prev => ({ ...prev, [selectedProduct.id]: false }))
      }
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    setActionLoading(prev => ({ ...prev, [productId]: true }))
    try {
      const result = await deleteProductAction(productId);

      if (!result.success) {
        throw new Error(result.error || "Ürün silinirken bir hata oluştu.");
      }

      setProducts(prev => prev.filter(p => p.id !== productId))
      toast({ title: "Başarılı", description: result.message || "Ürün başarıyla silindi." })
      // Revalidation is handled by the server action
    } catch (error: any) {
      toast({ title: "Hata", description: `Ürün silinirken hata: ${error.message}`, variant: "destructive" })
    } finally {
      setActionLoading(prev => ({ ...prev, [productId]: false }))
    }
  }

  const handleApproveProduct = async (productToApprove: Product) => {
    if (!productToApprove || !productToApprove.id) {
      toast({ title: "Hata", description: "Onaylanacak ürün bulunamadı.", variant: "destructive" });
      return;
    }
    const { id, slug, store } = productToApprove;
    setActionLoading(prev => ({ ...prev, [id]: true }))
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser(); // Get user on client to pass ID
      if (authError || !authData.user) {
        throw new Error(authError?.message || "Kullanıcı kimliği alınamadı.");
      }

      const result = await approveProductAction(
        { id, slug, store: store ? { slug: store.slug } : null },
        authData.user.id
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || "Ürün onaylanırken bir hata oluştu.");
      }

      // The Server Action already signed the URL and returned the full product data
      const approvedProductWithDetails: Product = {
        ...(result.data as any), // Cast as any to match existing Product type structure more easily
        // Ensure store and category objects are shaped correctly
        store: result.data.store ? {
          id: (result.data.store as any).id,
          name: (result.data.store as any).name,
          slug: (result.data.store as any).slug
        } : undefined,
        category: result.data.category ? {
          id: (result.data.category as any).id,
          name: (result.data.category as any).name,
          slug: (result.data.category as any).slug
        } : undefined,
        store_name: (result.data.store as any)?.name || 'Bilinmeyen Mağaza',
        category_name: (result.data.category as any)?.name || 'Bilinmeyen Kategori',
      };

      setProducts(prev => prev.map(p => (p.id === id ? approvedProductWithDetails : p)))
      toast({ title: "Başarılı", description: "Ürün onaylandı." })
    } catch (error: any) {
      toast({ title: "Hata", description: `Ürün onaylanırken hata: ${error.message}`, variant: "destructive" })
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const openRejectDialog = (product: Product) => {
    setProductToReject(product)
    setRejectReason(product.reject_reason || "")
    setRejectModalOpen(true)
  }

  const handleRejectProduct = async () => {
    if (!productToReject || !rejectReason.trim()) {
      toast({ title: "Gerekçe Gerekli", description: "Lütfen ret için bir gerekçe girin.", variant: "destructive" })
      return
    }
    const { id: productIdToReject, slug, store } = productToReject;
    setActionLoading(prev => ({ ...prev, [productIdToReject]: true }))
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error(authError?.message || "Kullanıcı kimliği alınamadı.");
      }

      const result = await rejectProductAction(
        { id: productIdToReject, slug, store: store ? { slug: store.slug } : null },
        authData.user.id,
        rejectReason
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || "Ürün reddedilirken bir hata oluştu.");
      }

      const rejectedProductWithDetails: Product = {
        ...(result.data as any),
        store: result.data.store ? { id: (result.data.store as any).id, name: (result.data.store as any).name, slug: (result.data.store as any).slug } : undefined,
        category: result.data.category ? { id: (result.data.category as any).id, name: (result.data.category as any).name, slug: (result.data.category as any).slug } : undefined,
        store_name: (result.data.store as any)?.name || 'Bilinmeyen Mağaza',
        category_name: (result.data.category as any)?.name || 'Bilinmeyen Kategori',
      };

      setProducts(prev => prev.map(p => (p.id === productIdToReject ? rejectedProductWithDetails : p)))
      toast({ title: "Başarılı", description: "Ürün reddedildi." })
      setRejectModalOpen(false)
      setProductToReject(null)
      setRejectReason("")
      // revalidatePath calls are in the server action
    } catch (error: any) {
      toast({ title: "Hata", description: `Ürün reddedilirken hata: ${error.message}`, variant: "destructive" })
    } finally {
      setActionLoading(prev => ({ ...prev, [productIdToReject]: false }))
    }
  }

  const handleReevaluateProduct = async (productToReevaluate: Product) => {
    if (!productToReevaluate || !productToReevaluate.id) {
      toast({ title: "Hata", description: "Yeniden değerlendirilecek ürün bulunamadı.", variant: "destructive" });
      return;
    }
    const { id, slug, store } = productToReevaluate;
    setActionLoading(prev => ({ ...prev, [id]: true }))
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error(authError?.message || "Kullanıcı kimliği alınamadı.");
      }

      const result = await reevaluateProductAction(
        { id, slug, store: store ? { slug: store.slug } : null },
        authData.user.id
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || "Ürün yeniden değerlendirilirken bir hata oluştu.");
      }

      const reevaluatedProductWithDetails: Product = {
        ...(result.data as any),
        store: result.data.store ? { id: (result.data.store as any).id, name: (result.data.store as any).name, slug: (result.data.store as any).slug } : undefined,
        category: result.data.category ? { id: (result.data.category as any).id, name: (result.data.category as any).name, slug: (result.data.category as any).slug } : undefined,
        store_name: (result.data.store as any)?.name || 'Bilinmeyen Mağaza',
        category_name: (result.data.category as any)?.name || 'Bilinmeyen Kategori',
      };

      setProducts(prev => prev.map(p => (p.id === id ? reevaluatedProductWithDetails : p)))
      toast({ title: "Başarılı", description: "Ürün tekrar bekleme durumuna alındı." })
    } catch (error: any) {
      toast({ title: "Hata", description: `Ürün yeniden değerlendirilirken hata: ${error.message}`, variant: "destructive" })
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  // UI Render
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Ürün Yönetimi</h1>
          <Button onClick={handleOpenAddDialog}>
            <Plus className="mr-2 h-4 w-4" /> Yeni Ürün Ekle
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtreler</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Ürün adı veya açıklama ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:col-span-2"
            />
            <Select value={categoryFilter === "" ? "__ALL_CATEGORIES__" : categoryFilter} onValueChange={(value) => setCategoryFilter(value === "__ALL_CATEGORIES__" ? "" : value)}>
              <SelectTrigger><SelectValue placeholder="Kategoriye Göre Filtrele" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL_CATEGORIES__">Tüm Kategoriler</SelectItem>
                {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={storeFilter === "" ? "__ALL_STORES__" : storeFilter} onValueChange={(value) => setStoreFilter(value === "__ALL_STORES__" ? "" : value)}>
              <SelectTrigger><SelectValue placeholder="Mağazaya Göre Filtrele" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL_STORES__">Tüm Mağazalar</SelectItem>
                {stores.map(store => <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as Tab)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            {TABS.map((tabItem) => (
              <TabsTrigger key={tabItem.key} value={tabItem.key}>{tabItem.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg">Ürünler yükleniyor...</p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Ürün Listesi ({filteredProducts.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Görsel</TableHead>
                    <TableHead>Ad</TableHead>
                    <TableHead>Mağaza</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Fiyat</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Onay</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        Bu sekmede gösterilecek ürün bulunmuyor.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedProducts.map(product => {
                      // Log for each product being mapped
                      console.log(`DEBUG: Mapping Product - Name: ${product.name}, Image URL: ${product.image_url}, Approved: ${product.approved}, Rejected: ${product.rejected}, Created At: ${product.created_at}`);
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Image
                              src={product.image_url || "/placeholder-image.png"}
                              alt={product.name}
                              width={50}
                              height={50}
                              className="rounded object-cover"
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link href={`/urun/${product.slug}`} target="_blank" className="hover:underline">
                              {product.name}
                            </Link>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {product.description ? product.description.replace(/<[^>]+>/g, '') : ''}
                            </p>
                            {product.reject_reason && (product.rejected || product.approved === false) && (
                              <p className="text-xs text-red-500 mt-1">Ret Nedeni: {product.reject_reason}</p>
                            )}
                          </TableCell>
                          <TableCell>{product.store?.name || "N/A"}</TableCell>
                          <TableCell>{product.category?.name || "N/A"}</TableCell>
                          <TableCell>{formatPrice(product.price)}</TableCell>
                          <TableCell>{product.stock_quantity}</TableCell>
                          <TableCell>
                            <Badge variant={product.is_active ? "default" : "secondary"}>
                              {product.is_active ? "Aktif" : "Pasif"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {product.approved === true ? <Badge variant="default">Onaylı</Badge> :
                              product.rejected === true ? <Badge variant="destructive">Reddedilmiş</Badge> :
                                <Badge variant="outline">Beklemede</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={actionLoading[product.id]}>
                                  {actionLoading[product.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/urun/${product.slug}`)}><Eye className="mr-2 h-4 w-4" />Önizle</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditProduct(product)}><Edit className="mr-2 h-4 w-4" />Düzenle</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {(product.approved === null || product.approved === false) && !product.rejected && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleApproveProduct(product)} className="text-green-600">
                                      <CheckCircle className="mr-2 h-4 w-4" /> Onayla
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openRejectDialog(product)} className="text-red-600">
                                      <XCircle className="mr-2 h-4 w-4" /> Reddet
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                {(product.approved === true || product.rejected === true) && (
                                  <DropdownMenuItem onClick={() => handleReevaluateProduct(product)}>
                                    <AlertCircle className="mr-2 h-4 w-4" /> Tekrar Değerlendir
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="text-red-600 focus:text-red-700"
                                >
                                  <Trash className="mr-2 h-4 w-4" /> Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
            {totalPages > 1 && (
              <div className="flex justify-center p-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>Önceki</Button>
                    </PaginationItem>
                    <span className="p-2 text-sm">Sayfa {currentPage} / {totalPages}</span>
                    <PaginationItem>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>Sonraki</Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </Card>
        )}

        {/* Add Product Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader><DialogTitle>Yeni Ürün Ekle</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Form fields ... */}
              <Label htmlFor="name">Ürün Adı</Label><Input id="name" name="name" value={formData.name || ""} onChange={handleInputChange} />
              <Label htmlFor="slug">Slug (Otomatik oluşur)</Label><Input id="slug" name="slug" value={formData.slug || ""} onChange={handleInputChange} />
              <Label htmlFor="description">Açıklama</Label><Textarea id="description" name="description" value={formData.description || ""} onChange={handleInputChange} />
              <Label htmlFor="price">Fiyat</Label><Input id="price" name="price" type="number" value={formData.price ?? ""} onChange={handleNumberChange} />
              <Label htmlFor="discount_price">İndirimli Fiyat (Opsiyonel)</Label><Input id="discount_price" name="discount_price" type="number" value={formData.discount_price ?? ""} onChange={handleNumberChange} />
              <Label htmlFor="stock_quantity">Stok Miktarı</Label><Input id="stock_quantity" name="stock_quantity" type="number" value={formData.stock_quantity ?? ""} onChange={handleNumberChange} />
              <Label htmlFor="category_id">Kategori</Label>
              <Select name="category_id" value={formData.category_id || ""} onValueChange={(value) => handleSelectChange('category_id', value)}>
                <SelectTrigger><SelectValue placeholder="Kategori Seçin" /></SelectTrigger>
                <SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>)}</SelectContent>
              </Select>
              <Label htmlFor="store_id">Mağaza</Label>
              <Select name="store_id" value={formData.store_id || ""} onValueChange={(value) => handleSelectChange('store_id', value)}>
                <SelectTrigger><SelectValue placeholder="Mağaza Seçin" /></SelectTrigger>
                <SelectContent>{stores.map(store => <SelectItem key={store.id} value={store.id.toString()}>{store.name}</SelectItem>)}</SelectContent>
              </Select>
              <Label htmlFor="image_url">Görsel URL</Label><Input id="image_url" name="image_url" value={formData.image_url || ""} onChange={handleInputChange} />
              <div className="flex items-center space-x-2">
                <Checkbox id="is_active_add" name="is_active" checked={!!formData.is_active} onCheckedChange={(checkedState) => handleCheckboxChange('is_active', checkedState === true)} />
                <Label htmlFor="is_active_add">Aktif mi?</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="is_featured_add" name="is_featured" checked={!!formData.is_featured} onCheckedChange={(checkedState) => handleCheckboxChange('is_featured', checkedState === true)} />
                <Label htmlFor="is_featured_add">Öne Çıkan mı?</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>İptal</Button>
              <Button onClick={handleAddProduct} disabled={actionLoading['add']}>{actionLoading['add'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Ekle</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        {selectedProduct && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader><DialogTitle>Ürünü Düzenle: {selectedProduct.name}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                {/* Form fields ... */}
                <Label htmlFor="edit_name">Ürün Adı</Label><Input id="edit_name" name="name" value={formData.name || ""} onChange={handleInputChange} />
                <Label htmlFor="edit_slug">Slug</Label><Input id="edit_slug" name="slug" value={formData.slug || ""} onChange={handleInputChange} />
                <Label htmlFor="edit_description">Açıklama</Label><Textarea id="edit_description" name="description" value={formData.description || ""} onChange={handleInputChange} />
                <Label htmlFor="edit_price">Fiyat</Label><Input id="edit_price" name="price" type="number" value={formData.price ?? ""} onChange={handleNumberChange} />
                <Label htmlFor="edit_discount_price">İndirimli Fiyat</Label><Input id="edit_discount_price" name="discount_price" type="number" value={formData.discount_price ?? ""} onChange={handleNumberChange} />
                <Label htmlFor="edit_stock_quantity">Stok Miktarı</Label><Input id="edit_stock_quantity" name="stock_quantity" type="number" value={formData.stock_quantity ?? ""} onChange={handleNumberChange} />
                <Label htmlFor="edit_category_id">Kategori</Label>
                <Select name="category_id" value={formData.category_id || ""} onValueChange={(value) => handleSelectChange('category_id', value)}>
                  <SelectTrigger><SelectValue placeholder="Kategori Seçin" /></SelectTrigger>
                  <SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>)}</SelectContent>
                </Select>
                <Label htmlFor="edit_store_id">Mağaza</Label>
                <Select name="store_id" value={formData.store_id || ""} onValueChange={(value) => handleSelectChange('store_id', value)}>
                  <SelectTrigger><SelectValue placeholder="Mağaza Seçin" /></SelectTrigger>
                  <SelectContent>{stores.map(store => <SelectItem key={store.id} value={store.id.toString()}>{store.name}</SelectItem>)}</SelectContent>
                </Select>
                <Label htmlFor="edit_image_url">Görsel URL</Label><Input id="edit_image_url" name="image_url" value={formData.image_url || ""} onChange={handleInputChange} />
                <div className="flex items-center space-x-2">
                  <Checkbox id="is_active_edit" name="is_active" checked={!!formData.is_active} onCheckedChange={(checkedState) => handleCheckboxChange('is_active', checkedState === true)} />
                  <Label htmlFor="is_active_edit">Aktif mi?</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="is_featured_edit" name="is_featured" checked={!!formData.is_featured} onCheckedChange={(checkedState) => handleCheckboxChange('is_featured', checkedState === true)} />
                  <Label htmlFor="is_featured_edit">Öne Çıkan mı?</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>İptal</Button>
                <Button onClick={handleUpdateProduct} disabled={actionLoading[selectedProduct.id]}>{actionLoading[selectedProduct.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Güncelle</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Reject Product Dialog */}
        <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ürünü Reddet: {productToReject?.name}</DialogTitle>
              <DialogDescription>
                Bu ürünü reddetmek üzeresiniz. Lütfen bir gerekçe girin.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="rejectReason">Ret Gerekçesi</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Örn: Ürün açıklaması yetersiz, görsel kalitesi düşük..."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setRejectModalOpen(false); setProductToReject(null); setRejectReason(""); }}>İptal</Button>
              <Button variant="destructive" onClick={handleRejectProduct} disabled={actionLoading[productToReject?.id || '']}>
                {actionLoading[productToReject?.id || ''] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Reddet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  )
}
