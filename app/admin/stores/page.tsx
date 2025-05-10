"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { useToast } from "@/hooks/use-toast"
import {
  MoreHorizontal,
  Search,
  Check,
  X,
  Star,
  Ban,
  Hourglass,
  ExternalLink,
  Eye,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  ShieldOff,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2
} from "lucide-react"
import { debounce } from "lodash"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import AdminLayout from '@/components/admin/AdminLayout'

interface StoreOwner {
  id: string;
  full_name?: string | null;
  email?: string | null;
}

interface Store {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  user_id: string;
  is_active?: boolean | null;
  is_verified?: boolean | null;
  approved?: boolean | null;
  is_featured?: boolean | null;
  commission_rate?: number | null;
  created_at: string;
  owner?: StoreOwner | null;
}

const ITEMS_PER_PAGE = 15;

export default function StoresPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalStores, setTotalStores] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [isActiveFilter, setIsActiveFilter] = useState<string>("")
  const [isVerifiedFilter, setIsVerifiedFilter] = useState<string>("")
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [confirmDialogProps, setConfirmDialogProps] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null)

  const debouncedSearch = useCallback(debounce((term: string) => {
    setDebouncedSearchTerm(term)
    setCurrentPage(1)
  }, 500), [])

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value
    setSearchTerm(term)
    debouncedSearch(term)
  }

  const handleActiveFilterChange = (value: string) => {
    setIsActiveFilter(value === 'all' ? '' : value)
    setCurrentPage(1)
  }

  const handleVerifiedFilterChange = (value: string) => {
    setIsVerifiedFilter(value === 'all' ? '' : value)
    setCurrentPage(1)
  }

  const fetchStoresData = useCallback(async (page = currentPage) => {
    setLoading(true)
    console.log(`Fetching stores: page=${page}, limit=${ITEMS_PER_PAGE}, search=${debouncedSearchTerm}, active=${isActiveFilter}, verified=${isVerifiedFilter}`)

    const params = new URLSearchParams({
      page: page.toString(),
      limit: ITEMS_PER_PAGE.toString(),
    })
    if (debouncedSearchTerm) params.set("searchTerm", debouncedSearchTerm)
    if (isActiveFilter) params.set("is_active", isActiveFilter)
    if (isVerifiedFilter) params.set("is_verified", isVerifiedFilter)

    try {
      const response = await fetch(`/api/admin/stores?${params.toString()}`, {
        cache: "no-store",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setStores(data.stores || [])
      setTotalPages(data.totalPages || 1)
      setTotalStores(data.totalStores || 0)
      setCurrentPage(data.currentPage || page)

    } catch (error: any) {
      console.error("Error fetching stores:", error)
      toast({ title: "Hata", description: `Mağazalar getirilirken hata oluştu: ${error.message}`, variant: "destructive" })
      setStores([])
      setTotalPages(1)
      setTotalStores(0)
      setCurrentPage(1)
    } finally {
      setLoading(false)
    }
  }, [currentPage, debouncedSearchTerm, isActiveFilter, isVerifiedFilter, toast])

  useEffect(() => {
    fetchStoresData(1)
  }, [])

  useEffect(() => {
    fetchStoresData(currentPage)
  }, [currentPage, debouncedSearchTerm, isActiveFilter, isVerifiedFilter, fetchStoresData])

  const handleStoreAction = async (storeId: string, action: string, payload?: any) => {
    let updatePayload: any = {};
    let successMessage = "";

    switch (action) {
      case 'activate':
        updatePayload = { is_active: true };
        successMessage = "Mağaza başarıyla aktif edildi.";
        break;
      case 'deactivate':
        updatePayload = { is_active: false };
        successMessage = "Mağaza başarıyla pasif edildi.";
        break;
      case 'verify':
        updatePayload = { is_verified: true, approved: true };
        successMessage = "Mağaza başarıyla doğrulandı ve onaylandı.";
        break;
      case 'unverify':
        updatePayload = { is_verified: false, approved: false };
        successMessage = "Mağaza doğrulaması ve onayı başarıyla kaldırıldı.";
        break;
      case 'feature':
        updatePayload = { is_featured: true };
        successMessage = "Mağaza başarıyla öne çıkanlara eklendi.";
        break;
      case 'unfeature':
        updatePayload = { is_featured: false };
        successMessage = "Mağaza başarıyla öne çıkanlardan kaldırıldı.";
        break;
      case 'delete':
        updatePayload = { is_active: false, approved: false, is_verified: false };
        successMessage = "Mağaza başarıyla pasif hale getirildi (silindi).";
        break;
      default:
        toast({ title: "Bilinmeyen İşlem", description: `İşlem "${action}" tanınmıyor.`, variant: "destructive" });
        return;
    }

    if (payload) {
      updatePayload = { ...updatePayload, ...payload };
    }

    try {
      const response = await fetch(`/api/admin/stores/${storeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || `HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Başarılı",
        description: successMessage,
      });

      fetchStoresData(currentPage);
    } catch (error: any) {
      console.error(`Error performing action "${action}" on store ${storeId}:`, error);
      toast({
        title: "Hata",
        description: error.message || `İşlem "${action}" gerçekleştirilemedi.`,
        variant: "destructive",
      });
    }
  };

  const openConfirmationDialog = (title: string, description: string, onConfirm: () => void) => {
    setConfirmDialogProps({ title, description, onConfirm })
    setIsConfirmDialogOpen(true)
  }

  const handleViewStore = (store: Store) => {
    setSelectedStore(store)
    setIsViewDialogOpen(true)
  }

  const getVerificationBadge = (isVerified?: boolean | null, isApproved?: boolean | null) => {
    if (isVerified && isApproved) {
      return <Badge variant="success" className="border-green-600/30 bg-green-100 text-green-700"><ShieldCheck className="h-3.5 w-3.5 mr-1" />Onaylı ve Doğrulanmış</Badge>;
    } else if (isApproved && !isVerified) {
      return <Badge variant="info" className="border-blue-600/30 bg-blue-100 text-blue-700"><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Onaylı (Doğrulanmamış)</Badge>;
    } else if (!isApproved && isVerified === false) {
      return <Badge variant="destructive" className="border-red-600/30 bg-red-100 text-red-700"><ShieldOff className="h-3.5 w-3.5 mr-1" />Onaysız/Reddedilmiş</Badge>;
    }
    return <Badge variant="warning" className="border-amber-600/30 bg-amber-100 text-amber-700"><Clock className="h-3.5 w-3.5 mr-1" />Beklemede</Badge>;
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Mağaza Yönetimi</h1>
        <p className="text-muted-foreground">Mağazaları görüntüleyin, filtreleyin ve yönetin.</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtrele ve Ara</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative sm:col-span-1">
              <Label htmlFor="search">Mağaza Ara</Label>
              <Search className="absolute left-3 top-[calc(50%+8px)] transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="search"
                placeholder="Mağaza adı veya açıklama..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 w-full mt-1"
              />
            </div>
            <div>
              <Label htmlFor="activeFilter">Aktiflik Durumu</Label>
              <Select value={isActiveFilter} onValueChange={handleActiveFilterChange}>
                <SelectTrigger id="activeFilter" className="w-full mt-1">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="true">Aktif</SelectItem>
                  <SelectItem value="false">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="verifiedFilter">Onay Durumu (is_verified)</Label>
              <Select value={isVerifiedFilter} onValueChange={handleVerifiedFilterChange}>
                <SelectTrigger id="verifiedFilter" className="w-full mt-1">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="true">Onaylı (Doğrulanmış)</SelectItem>
                  <SelectItem value="false">Onaysız (Doğrulanmamış)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mağaza Listesi</CardTitle>
          <CardDescription>Toplam {totalStores} mağaza bulundu.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Mağaza Adı</TableHead>
                <TableHead>Sahip</TableHead>
                <TableHead>Aktif</TableHead>
                <TableHead>Doğrulama/Onay</TableHead>
                <TableHead>Öne Çıkan</TableHead>
                <TableHead>Kayıt Tarihi</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                      Mağazalar yükleniyor...
                    </div>
                  </TableCell>
                </TableRow>
              ) : stores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    Arama kriterlerine uygun mağaza bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell>
                      <Image
                        src={store.logo_url || "/placeholder-logo.png"}
                        alt={`${store.name} Logo`}
                        width={40}
                        height={40}
                        className="rounded-full object-cover w-10 h-10 border"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/magaza/${store.slug}`} target="_blank" className="hover:underline hover:text-primary flex items-center gap-1.5 group">
                        {store.name}
                        <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                      </Link>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{store.description}</p>
                    </TableCell>
                    <TableCell>
                      {store.owner ? (
                        <div className="text-sm">
                          {store.owner.full_name || "İsimsiz"}
                          <p className="text-xs text-muted-foreground">{store.owner.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sahip Atanmamış</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={store.is_active ? 'success' : 'secondary'} className={cn("capitalize", store.is_active ? 'border-green-600/30 bg-green-100 text-green-700' : 'border-gray-600/30 bg-gray-100 text-gray-700')}>
                        {store.is_active ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                        {store.is_active ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getVerificationBadge(store.is_verified, store.approved)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={store.is_featured ? 'default' : 'outline'} className={cn("capitalize", store.is_featured ? 'bg-purple-100 text-purple-700 border-purple-600/30' : 'text-muted-foreground')}>
                        {store.is_featured ? <Star className="h-3.5 w-3.5 mr-1" /> : <Ban className="h-3.5 w-3.5 mr-1" />}
                        {store.is_featured ? "Evet" : "Hayır"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(store.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Menüyü aç</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewStore(store)}>
                            <Eye className="mr-2 h-4 w-4" />Detayları Gör
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/admin/stores/edit/${store.id}`)}>
                            <Edit className="mr-2 h-4 w-4" />Düzenle
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleStoreAction(store.id, store.is_active ? 'deactivate' : 'activate')}>
                            {store.is_active ? <ToggleLeft className="mr-2 h-4 w-4" /> : <ToggleRight className="mr-2 h-4 w-4" />}
                            {store.is_active ? "Pasif Yap" : "Aktif Yap"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStoreAction(store.id, (store.is_verified && store.approved) ? 'unverify' : 'verify')}>
                            {(store.is_verified && store.approved) ? <ShieldOff className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                            {(store.is_verified && store.approved) ? "Onay/Doğrulama Kaldır" : "Onayla ve Doğrula"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStoreAction(store.id, store.is_featured ? 'unfeature' : 'feature')}>
                            {store.is_featured ? <Ban className="mr-2 h-4 w-4" /> : <Star className="mr-2 h-4 w-4" />}
                            {store.is_featured ? "Öne Çıkanlardan Kaldır" : "Öne Çıkar"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openConfirmationDialog('Mağazayı Sil', `'${store.name}' mağazasını kalıcı olarak pasif hale getirmek (silmek) istediğinizden emin misiniz?`, () => handleStoreAction(store.id, 'delete'))}
                            className="text-red-600 focus:bg-red-50 focus:text-red-700"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Sil (Pasif Yap)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        {totalPages > 1 && (
          <CardFooter className="py-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(currentPage - 1); }}
                    aria-disabled={currentPage <= 1}
                    className={cn("cursor-pointer", currentPage <= 1 && "pointer-events-none opacity-50")}
                  />
                </PaginationItem>
                {[...Array(totalPages)].map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => { e.preventDefault(); setCurrentPage(i + 1); }}
                      isActive={currentPage === i + 1}
                      className="cursor-pointer"
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) setCurrentPage(currentPage + 1); }}
                    aria-disabled={currentPage >= totalPages}
                    className={cn("cursor-pointer", currentPage >= totalPages && "pointer-events-none opacity-50")}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CardFooter>
        )}
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedStore && (
            <>
              <DialogHeader>
                <DialogTitle>Mağaza Detayları</DialogTitle>
                <DialogDescription>
                  {selectedStore.name} mağazasının detayları.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right col-span-1">ID</Label>
                  <span className="col-span-3 text-sm text-muted-foreground font-mono">{selectedStore.id}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Sahip</Label>
                  <span className="col-span-3 text-sm">{selectedStore.owner?.full_name || selectedStore.owner?.email || "-"}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Açıklama</Label>
                  <p className="col-span-3 text-sm text-muted-foreground">{selectedStore.description || "-"}</p>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Slug</Label>
                  <span className="col-span-3 text-sm font-mono">{selectedStore.slug}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Kayıt Tarihi</Label>
                  <span className="col-span-3 text-sm">{formatDate(selectedStore.created_at)}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Durum</Label>
                  <div className="col-span-3 flex flex-wrap gap-2">
                    {getVerificationBadge(selectedStore.is_verified, selectedStore.approved)}
                    <Badge variant={selectedStore.is_active ? 'success' : 'secondary'}>{selectedStore.is_active ? "Aktif" : "Pasif"}</Badge>
                    <Badge variant={selectedStore.is_featured ? 'default' : 'outline'}>{selectedStore.is_featured ? "Öne Çıkan" : "Normal"}</Badge>
                  </div>
                </div>
              </div>
              <DialogFooter className="sm:justify-start">
                <Button type="button" onClick={() => router.push(`/admin/stores/edit/${selectedStore.id}`)}>
                  <Edit className="mr-2 h-4 w-4" /> Düzenle
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">Kapat</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialogProps?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialogProps?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirmDialogProps?.onConfirm(); setIsConfirmDialogOpen(false); }}>Devam Et</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  )
}
