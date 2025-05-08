"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useAuth } from "@/hooks/use-auth"
import {
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Settings,
  Store,
  Tag,
  Trash,
  Users,
  X,
  FileText,
  Database,
  Bell,
  AlertCircle,
  ShoppingBag,
  Star,
  Check,
  ExternalLink,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function StoresPage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stores, setStores] = useState<any[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedStore, setSelectedStore] = useState<any>(null)
  const supabase = createClientComponentClient()
  const [showUpdateAlert, setShowUpdateAlert] = useState(false)

  const handleUpdateDatabase = async () => {
    try {
      const response = await fetch("/api/admin/update-stores", {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update database")
      }

      toast({
        title: "Başarılı",
        description: "Veritabanı başarıyla güncellendi. Sayfa yenileniyor...",
      })

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error: any) {
      console.error("Error updating database:", error)
      toast({
        title: "Hata",
        description: error.message || "Veritabanı güncellenirken bir hata oluştu.",
        variant: "destructive",
      })
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
      router.push("/auth/login?returnTo=/admin/stores")
      return
    }

    const fetchStoresData = async () => {
      setLoading(true)
      try {
        // First, try to create the foreign key constraint if it doesn't exist
        try {
          const createConstraintQuery = `
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'stores_user_id_fkey'
                AND table_name = 'stores'
              ) THEN
                ALTER TABLE IF EXISTS public.stores
                ADD CONSTRAINT stores_user_id_fkey
                FOREIGN KEY (user_id) REFERENCES public.profiles(id);
              END IF;
            END $$;
          `

          await supabase.rpc("execute_sql", { query: createConstraintQuery })
        } catch (error) {
          console.error("Error creating constraint:", error)
          // Continue even if this fails
        }

        // Fetch all stores
        const fetchedStores = await fetchStores()

        setStores(fetchedStores || [])
      } catch (error) {
        console.error("Error fetching stores:", error)
        setShowUpdateAlert(true)
        toast({
          title: "Hata",
          description: "Mağazalar yüklenirken bir hata oluştu.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    async function fetchStores() {
      try {
        // First try to use the get_stores_with_owners function
        const { data: functionData, error: functionError } = await supabase.rpc("get_stores_with_owners")

        if (!functionError && functionData) {
          return functionData
        }

        // If the function doesn't exist, fall back to the manual approach
        // First try to get all stores
        const { data: storesData, error: storesError } = await supabase.from("stores").select("*")

        if (storesError) {
          console.error("Error fetching stores basic data:", storesError)
          return []
        }

        // If we have stores, try to get owner information for each store
        if (storesData && storesData.length > 0) {
          // Get all unique user IDs from stores
          const userIds = storesData.map((store) => store.user_id).filter((id) => id !== null && id !== undefined)

          // If we have user IDs, fetch their profiles
          if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from("profiles")
              .select("id, full_name, email")
              .in("id", userIds)

            if (!profilesError && profilesData) {
              // Create a map of user IDs to profile data for quick lookup
              const profilesMap = profilesData.reduce((map, profile) => {
                map[profile.id] = profile
                return map
              }, {})

              // Attach profile data to each store
              return storesData.map((store) => ({
                ...store,
                owner_name:
                  store.user_id && profilesMap[store.user_id] ? profilesMap[store.user_id].full_name : store.owner_name,
                owner_email:
                  store.user_id && profilesMap[store.user_id] ? profilesMap[store.user_id].email : store.owner_email,
              }))
            }
          }
        }

        return storesData || []
      } catch (error) {
        console.error("Error fetching stores:", error)
        return []
      }
    }

    if (user && user.role === "admin") {
      fetchStoresData()
    }
  }, [user, authLoading, router, supabase, toast])

  const handleVerifyStore = async (id: string, isVerified: boolean) => {
    try {
      const { error } = await supabase.from("stores").update({ is_verified: isVerified }).eq("id", id)

      if (error) throw error

      toast({
        title: "Başarılı",
        description: isVerified ? "Mağaza doğrulandı." : "Mağaza doğrulaması kaldırıldı.",
      })

      // Update stores list
      setStores(
        stores.map((store) => {
          if (store.id === id) {
            return { ...store, is_verified: isVerified }
          }
          return store
        }),
      )
    } catch (error: any) {
      console.error("Error updating store:", error)
      toast({
        title: "Hata",
        description: error.message || "Mağaza güncellenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleFeatureStore = async (id: string, isFeatured: boolean) => {
    try {
      const { error } = await supabase.from("stores").update({ is_featured: isFeatured }).eq("id", id)

      if (error) throw error

      toast({
        title: "Başarılı",
        description: isFeatured ? "Mağaza öne çıkarıldı." : "Mağaza öne çıkarma kaldırıldı.",
      })

      // Update stores list
      setStores(
        stores.map((store) => {
          if (store.id === id) {
            return { ...store, is_featured: isFeatured }
          }
          return store
        }),
      )
    } catch (error: any) {
      console.error("Error updating store:", error)
      toast({
        title: "Hata",
        description: error.message || "Mağaza güncellenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase.from("stores").update({ is_active: isActive }).eq("id", id)

      if (error) throw error

      toast({
        title: "Başarılı",
        description: isActive ? "Mağaza aktifleştirildi." : "Mağaza devre dışı bırakıldı.",
      })

      // Update stores list
      setStores(
        stores.map((store) => {
          if (store.id === id) {
            return { ...store, is_active: isActive }
          }
          return store
        }),
      )
    } catch (error: any) {
      console.error("Error updating store:", error)
      toast({
        title: "Hata",
        description: error.message || "Mağaza güncellenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteStore = async (id: string) => {
    try {
      const { error } = await supabase.from("stores").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Başarılı",
        description: "Mağaza başarıyla silindi.",
      })

      // Update stores list
      setStores(stores.filter((store) => store.id !== id))
    } catch (error: any) {
      console.error("Error deleting store:", error)
      toast({
        title: "Hata",
        description: error.message || "Mağaza silinirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleViewStore = (store: any) => {
    setSelectedStore(store)
    setIsViewDialogOpen(true)
  }

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
            onClick={() => signOut()}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-gray-800 border-b p-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Mağazalar</h1>
          <div className="w-6"></div> {/* Spacer for alignment */}
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Mağaza Yönetimi</h1>
              {showUpdateAlert && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Veritabanı Hatası</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2">
                    <p>Mağaza verileri yüklenirken bir hata oluştu. Veritabanı yapısının güncellenmesi gerekiyor.</p>
                    <Button onClick={handleUpdateDatabase} variant="outline" size="sm" className="w-fit">
                      Veritabanını Güncelle
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Mağazalar</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mağaza</TableHead>
                      <TableHead>Satıcı</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Değerlendirme</TableHead>
                      <TableHead>Komisyon</TableHead>
                      <TableHead>Kayıt Tarihi</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.length > 0 ? (
                      stores.map((store) => (
                        <TableRow key={store.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="h-10 w-10 relative rounded overflow-hidden bg-gray-100">
                                {store.logo_url ? (
                                  <Image
                                    src={store.logo_url || "/placeholder.svg"}
                                    alt={store.name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                                    <Store className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{store.name}</div>
                                <div className="text-sm text-muted-foreground">{store.slug}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{store.owner_name || store.owner_email || "Bilinmiyor"}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  store.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                }`}
                              >
                                {store.is_active ? "Aktif" : "Pasif"}
                              </span>
                              {store.is_verified && (
                                <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 flex items-center">
                                  <Check className="h-3 w-3 mr-1" />
                                  Doğrulanmış
                                </span>
                              )}
                              {store.is_featured && (
                                <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 flex items-center">
                                  <Star className="h-3 w-3 mr-1" />
                                  Öne Çıkan
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {store.rating > 0 ? (
                              <div className="flex items-center">
                                <Star className="h-4 w-4 text-yellow-500 mr-1 fill-yellow-500" />
                                <span>
                                  {store.rating.toFixed(1)} ({store.review_count})
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Değerlendirme yok</span>
                            )}
                          </TableCell>
                          <TableCell>{store.commission_rate}%</TableCell>
                          <TableCell>
                            {new Date(store.created_at).toLocaleDateString("tr-TR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewStore(store)}>
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Detaylar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleVerifyStore(store.id, !store.is_verified)}>
                                  <Check className="mr-2 h-4 w-4" />
                                  {store.is_verified ? "Doğrulamayı Kaldır" : "Doğrula"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleFeatureStore(store.id, !store.is_featured)}>
                                  <Star className="mr-2 h-4 w-4" />
                                  {store.is_featured ? "Öne Çıkarmayı Kaldır" : "Öne Çıkar"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleActive(store.id, !store.is_active)}>
                                  {store.is_active ? (
                                    <>
                                      <X className="mr-2 h-4 w-4" />
                                      Devre Dışı Bırak
                                    </>
                                  ) : (
                                    <>
                                      <Check className="mr-2 h-4 w-4" />
                                      Aktifleştir
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <Trash className="mr-2 h-4 w-4" />
                                      Sil
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Mağazayı Sil</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Bu mağazayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve
                                        mağazaya ait tüm ürünler de silinecektir.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>İptal</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteStore(store.id)}
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
                          Henüz mağaza bulunmuyor.
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

      {/* View Store Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Mağaza Detayları</DialogTitle>
            <DialogDescription>Mağaza bilgilerini görüntüleyin.</DialogDescription>
          </DialogHeader>
          {selectedStore && (
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 relative rounded overflow-hidden bg-gray-100">
                  {selectedStore.logo_url ? (
                    <Image
                      src={selectedStore.logo_url || "/placeholder.svg"}
                      alt={selectedStore.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      <Store className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedStore.name}</h2>
                  <p className="text-sm text-muted-foreground">@{selectedStore.slug}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <h3 className="font-semibold mb-2">Mağaza Bilgileri</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Açıklama:</span>
                      <p>{selectedStore.description || "Açıklama yok"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Adres:</span>
                      <p>
                        {selectedStore.address
                          ? `${selectedStore.address}, ${selectedStore.city}, ${selectedStore.country}`
                          : "Adres bilgisi yok"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Komisyon Oranı:</span>
                      <p>%{selectedStore.commission_rate}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Değerlendirme:</span>
                      <p>
                        {selectedStore.rating > 0
                          ? `${selectedStore.rating.toFixed(1)} (${selectedStore.review_count} değerlendirme)`
                          : "Değerlendirme yok"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Kayıt Tarihi:</span>
                      <p>
                        {new Date(selectedStore.created_at).toLocaleDateString("tr-TR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">İletişim Bilgileri</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Satıcı:</span>
                      <p>{selectedStore.user?.full_name || "Bilinmiyor"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">E-posta:</span>
                      <p>{selectedStore.contact_email || selectedStore.user?.email || "Belirtilmemiş"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Telefon:</span>
                      <p>{selectedStore.contact_phone || "Belirtilmemiş"}</p>
                    </div>
                  </div>

                  <h3 className="font-semibold mt-4 mb-2">Durum</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          selectedStore.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {selectedStore.is_active ? "Aktif" : "Pasif"}
                      </span>
                      {selectedStore.is_verified && (
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 flex items-center">
                          <Check className="h-3 w-3 mr-1" />
                          Doğrulanmış
                        </span>
                      )}
                      {selectedStore.is_featured && (
                        <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 flex items-center">
                          <Star className="h-3 w-3 mr-1" />
                          Öne Çıkan
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Kapat
            </Button>
            <Button
              onClick={() => {
                setIsViewDialogOpen(false)
                window.open(`/magaza/${selectedStore?.slug}`, "_blank")
              }}
            >
              Mağazayı Görüntüle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
