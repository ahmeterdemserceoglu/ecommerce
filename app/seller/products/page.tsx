"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import SellerSidebar from "@/components/seller/seller-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Menu, X, LogOut, Search, Plus, Edit, Trash2 } from "lucide-react"
import { getSignedImageUrl } from "@/lib/get-signed-url"

type ProductVariant = {
  id?: string;
  price: number | null;
  discount_price: number | null;
  is_default: boolean;
};

type Product = {
  id: string
  name: string
  description?: string
  price: number | null;
  discount_price?: number | null;
  stock_quantity: number | null;
  is_active: boolean
  store_id: string
  category_id?: string
  image_url?: string
  approval_status?: string
  is_approved?: boolean | null
  reject_reason?: string | null
  created_at: string
  updated_at?: string
  has_variants: boolean
  hide?: boolean;
  product_variants?: ProductVariant[];
}

type Category = {
  id: string
  name: string
  description?: string
}

function ProductImageCell({
  imagePath,
  alt,
  onImageError,
}: { imagePath: string; alt: string; onImageError?: () => void }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (imagePath) {
      const path = imagePath.split("/object/public/images/")[1] || imagePath.split("/images/")[1] || imagePath
      getSignedImageUrl("products/" + path.split("products/")[1]).then(setSignedUrl)
    }
  }, [imagePath])
  if (error) {
    if (onImageError) onImageError()
    return null
  }
  return (
    <img
      src={signedUrl || "/placeholder.svg"}
      alt={alt}
      className="h-10 w-10 rounded-md object-cover"
      onError={() => setError(true)}
    />
  )
}

export default function ProductsPage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentTab, setCurrentTab] = useState("all")
  const [storeId, setStoreId] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/auth/login?returnTo=/seller/products")
      return
    }
    if (user.role !== "seller" && user.role !== "admin") {
      router.push("/hesabim")
      return
    }

    fetchStoreId()
    fetchCategories()
  }, [user, authLoading])

  useEffect(() => {
    if (storeId) {
      fetchProducts()
    }
  }, [storeId])

  useEffect(() => {
    let result = [...products]
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(
        (product) =>
          product &&
          product.id &&
          product.is_active !== false &&
          !product.hide &&
          (product.name.toLowerCase().includes(search) ||
            (product.description && product.description.toLowerCase().includes(search))),
      )
    } else {
      result = result.filter((product) => product && product.id && product.is_active !== false && !product.hide)
    }
    if (categoryFilter !== "all") {
      result = result.filter((product) => product.category_id === categoryFilter)
    }
    if (statusFilter !== "all") {
      if (statusFilter === 'approved') {
        result = result.filter(p => p.is_approved === true);
      } else if (statusFilter === 'pending') {
        result = result.filter(p => p.is_approved === null || p.is_approved === undefined);
      } else if (statusFilter === 'rejected') {
        result = result.filter(p => p.is_approved === false);
      }
    }
    if (currentTab !== "all") {
      if (currentTab === "active") {
        result = result.filter((product) => product.is_active)
      } else if (currentTab === "inactive") {
        result = result.filter((product) => !product.is_active)
      }
    }
    setFilteredProducts(result)
  }, [products, searchTerm, categoryFilter, statusFilter, currentTab])

  async function fetchStoreId() {
    try {
      if (!user || !user.id) {
        throw new Error("Kullanıcı bilgisi alınamadı")
      }
      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (storeError) {
        toast({
          title: "Bilgi",
          description: "Mağaza bulunamadı. Lütfen önce mağaza oluşturun.",
          variant: "default",
        })
        router.push("/seller/settings")
        return
      }
      if (!storeData) {
        toast({
          title: "Bilgi",
          description: "Mağaza bulunamadı. Lütfen önce mağaza oluşturun.",
          variant: "default",
        })
        router.push("/seller/settings")
        return
      }
      setStoreId(storeData.id)
    } catch (error: any) {
      console.error("Error fetching store ID:", error)
      toast({
        title: "Hata",
        description: "Mağaza bilgisi alınamadı: " + error.message,
        variant: "destructive",
      })
    }
  }

  async function fetchProducts() {
    setLoading(true)
    try {
      if (!storeId) return;

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          price,
          discount_price,
          stock_quantity,
          is_active,
          store_id,
          category_id,
          image_url,
          is_approved,
          reject_reason,
          created_at,
          updated_at,
          has_variants,
          product_variants (id, price, discount_price, is_default)
        `)
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })

      if (productsError) {
        throw productsError;
      }

      const processedProducts = productsData?.map((product: any) => {
        let displayPrice = product.price;
        let displayDiscountPrice = product.discount_price;

        if (product.has_variants && product.product_variants && product.product_variants.length > 0) {
          const defaultVariant = product.product_variants.find((variant: ProductVariant) => variant.is_default);
          if (defaultVariant && typeof defaultVariant.price === 'number') {
            displayPrice = defaultVariant.price;
            displayDiscountPrice = typeof defaultVariant.discount_price === 'number' ? defaultVariant.discount_price : null;
          }
        }
        return {
          ...product,
          price: displayPrice,
          discount_price: displayDiscountPrice,
        };
      }) || [];

      setProducts(processedProducts as Product[])

    } catch (error: any) {
      console.error("Error fetching products:", error)
      toast({
        title: "Hata",
        description: "Ürünler yüklenirken bir hata oluştu: " + error.message,
        variant: "destructive",
      })
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name")

      if (error) throw error
      setCategories(data || [])
    } catch (error: any) {
      console.error("Error fetching categories:", error)
      toast({
        title: "Hata",
        description: "Kategoriler yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  function handleEditProduct(product: Product) {
    router.push(`/seller/products/${product.id}/edit`)
  }

  function handleDeleteProduct(product: Product) {
    setSelectedProduct(product)
    setDeleteLoading(false);
    setDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!selectedProduct) return
    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/products/${selectedProduct.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Ürün silinirken bir hata oluştu.")
      }

      // Update the product list to reflect the change (mark as inactive and hide it)
      setProducts((prevProducts) =>
        prevProducts.map((p) =>
          p.id === selectedProduct.id ? { ...p, is_active: false, hide: true } : p
        )
      )

      // Also directly update the filtered products to immediately hide the deleted product
      setFilteredProducts((prevFiltered) =>
        prevFiltered.filter((p) => p.id !== selectedProduct.id)
      )

      toast({
        title: "Başarılı",
        description: `"${selectedProduct.name}" adlı ürün başarıyla devre dışı bırakıldı.`,
        variant: "success",
      })
    } catch (error: any) {
      console.error("Error deactivating product:", error)
      toast({
        title: "Hata",
        description: error.message || "Ürün devre dışı bırakılırken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
      setDeleteDialogOpen(false)
      setSelectedProduct(null)
    }
  }

  function getApprovalStatusBadge(product: Product) {
    if (product.is_approved === true && (!product.reject_reason || product.reject_reason === "")) {
      return <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">Onaylandı</span>
    }
    if (product.is_approved === false && product.reject_reason) {
      return (
        <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs" title={product.reject_reason}>
          Reddedildi
        </span>
      )
    }
    return <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs">Onay Bekliyor</span>
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">Satıcı Paneli Yükleniyor</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Lütfen bekleyin, bilgileriniz hazırlanıyor...</p>
        </div>
      </div>
    )
  }

  console.log("Rendering ProductsPage, deleteLoading state:", deleteLoading);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <SellerSidebar />

      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <div className="p-4 border-b flex items-center justify-between">
            <h1 className="text-xl font-bold">Satıcı Panel</h1>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="px-2 space-y-1">{/* Menu items would go here */}</nav>
          </div>
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                signOut()
                setIsMobileMenuOpen(false)
              }}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Çıkış Yap
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="md:hidden bg-white dark:bg-gray-800 border-b p-4 flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Ürünlerim</h1>
          <div className="w-6"></div>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ürünlerim</h1>
              <p className="text-gray-500 dark:text-gray-400">Mağazanızdaki ürünleri yönetin</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Button asChild>
                <Link href="/seller/products/new" className="flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni Ürün Ekle
                </Link>
              </Button>
            </div>
          </div>

          <Tabs value={currentTab} onValueChange={setCurrentTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">Tüm Ürünler</TabsTrigger>
              <TabsTrigger value="active">Aktif</TabsTrigger>
              <TabsTrigger value="inactive">Pasif</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Ürün ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tüm Kategoriler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tüm Durumlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="approved">Onaylandı</SelectItem>
                <SelectItem value="pending">Onay Bekliyor</SelectItem>
                <SelectItem value="rejected">Reddedildi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ürün Listesi</CardTitle>
              <CardDescription>
                Toplam {filteredProducts.length} ürün{" "}
                {searchTerm || categoryFilter !== "all" || statusFilter !== "all" || currentTab !== "all"
                  ? "(filtreli görünüm)"
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center h-60">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                  <p className="text-lg font-medium text-gray-700">Ürünler yükleniyor...</p>
                  <p className="text-sm text-gray-500">Lütfen bekleyin, ürünleriniz hazırlanıyor.</p>
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ürün</TableHead>
                        <TableHead>Fiyat</TableHead>
                        <TableHead>Stok</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Onay</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map(
                        (product) =>
                          !product.hide && (
                            <TableRow key={product.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <ProductImageCell
                                    imagePath={product.image_url || ""}
                                    alt={product.name}
                                    onImageError={() => {
                                      setProducts((prev) =>
                                        prev.map((p) => (p.id === product.id ? { ...p, hide: true } : p)),
                                      )
                                    }}
                                  />
                                  <div>
                                    <div className="font-medium">{product.name}</div>
                                    {product.description && (
                                      <div
                                        className="text-sm text-gray-500 truncate max-w-[200px]"
                                        dangerouslySetInnerHTML={{ __html: product.description }}
                                      />
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {typeof product.price === 'number'
                                  ? product.price.toLocaleString("tr-TR", {
                                    style: "currency",
                                    currency: "TRY",
                                  })
                                  : "-"}
                              </TableCell>
                              <TableCell>{product.has_variants ? "Varyantlı" : (product.stock_quantity ?? '-')}</TableCell>
                              <TableCell>{categories.find((c) => c.id === product.category_id)?.name || "-"}</TableCell>
                              <TableCell>
                                {product.is_active ? (
                                  <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">
                                    Aktif
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs">
                                    Pasif
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {getApprovalStatusBadge(product)}
                                {product.is_approved === false && product.reject_reason && (
                                  <div
                                    className="mt-1 text-xs text-red-600 max-w-xs truncate"
                                    title={product.reject_reason}
                                  >
                                    <b>Ret Sebebi:</b> {product.reject_reason}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={() => handleEditProduct(product)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-500 hover:text-red-700"
                                    onClick={() => handleDeleteProduct(product)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ),
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-medium">Ürün bulunamadı</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {searchTerm || categoryFilter !== "all" || statusFilter !== "all" || currentTab !== "all"
                      ? "Arama kriterlerinize uygun ürün bulunamadı. Filtreleri değiştirmeyi deneyin."
                      : "Henüz ürün eklenmemiş. Yeni ürün eklemek için 'Yeni Ürün Ekle' butonuna tıklayın."}
                  </p>
                  {(searchTerm || categoryFilter !== "all" || statusFilter !== "all" || currentTab !== "all") && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setSearchTerm("")
                        setCategoryFilter("all")
                        setStatusFilter("all")
                        setCurrentTab("all")
                      }}
                    >
                      Filtreleri Temizle
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ürünü Sil</DialogTitle>
          </DialogHeader>
          <p>
            <strong>{selectedProduct?.name}</strong> adlı ürünü silmek istediğinize emin misiniz? Bu işlem geri
            alınamaz.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                console.log("Sil butonuna tıklandı, current deleteLoading:", deleteLoading);
                if (!deleteLoading) {
                  handleConfirmDelete()
                }
              }}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Siliniyor..." : "Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

