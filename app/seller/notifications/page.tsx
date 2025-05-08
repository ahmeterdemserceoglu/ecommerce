"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import { tr } from "date-fns/locale"
import SellerSidebar from "@/components/seller/seller-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import {
  Bell,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Info,
  Menu,
  X,
  RefreshCw,
  Search,
  Trash2,
  CheckCheck,
} from "lucide-react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

type Notification = {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
  related_id?: string
  related_type?: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [readFilter, setReadFilter] = useState("all")
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/auth/login?returnTo=/seller/notifications")
      return
    }
    if (user.role !== "seller" && user.role !== "admin") {
      router.push("/hesabim")
      return
    }

    fetchNotifications()
  }, [user, authLoading])

  useEffect(() => {
    // Filter notifications based on search term, type filter, and read filter
    let result = [...notifications]

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(
        (notification) =>
          notification.title.toLowerCase().includes(search) || notification.message.toLowerCase().includes(search),
      )
    }

    if (typeFilter !== "all") {
      result = result.filter((notification) => notification.type === typeFilter)
    }

    if (readFilter !== "all") {
      const isRead = readFilter === "read"
      result = result.filter((notification) => notification.is_read === isRead)
    }

    setFilteredNotifications(result)
  }, [notifications, searchTerm, typeFilter, readFilter])

  async function fetchNotifications() {
    setLoading(true)
    setIsRefreshing(true)

    try {
      if (!user || !user.id) {
        throw new Error("Kullanıcı bilgisi alınamadı")
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setNotifications(data || [])
    } catch (error: any) {
      console.error("Error fetching notifications:", error)
      toast({
        title: "Hata",
        description: "Bildirimler yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  async function markAsRead(id: string) {
    try {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id)

      if (error) {
        throw error
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) => (notification.id === id ? { ...notification, is_read: true } : notification)),
      )

      toast({
        title: "Başarılı",
        description: "Bildirim okundu olarak işaretlendi.",
      })
    } catch (error: any) {
      console.error("Error marking notification as read:", error)
      toast({
        title: "Hata",
        description: "Bildirim işaretlenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  async function markAllAsRead() {
    try {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", user?.id)

      if (error) {
        throw error
      }

      // Update local state
      setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })))

      toast({
        title: "Başarılı",
        description: "Tüm bildirimler okundu olarak işaretlendi.",
      })
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error)
      toast({
        title: "Hata",
        description: "Bildirimler işaretlenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  async function deleteNotification(id: string) {
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id)

      if (error) {
        throw error
      }

      // Update local state
      setNotifications((prev) => prev.filter((notification) => notification.id !== id))

      toast({
        title: "Başarılı",
        description: "Bildirim silindi.",
      })
    } catch (error: any) {
      console.error("Error deleting notification:", error)
      toast({
        title: "Hata",
        description: "Bildirim silinirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  async function deleteAllNotifications() {
    try {
      const { error } = await supabase.from("notifications").delete().eq("user_id", user?.id)

      if (error) {
        throw error
      }

      // Update local state
      setNotifications([])

      toast({
        title: "Başarılı",
        description: "Tüm bildirimler silindi.",
      })
    } catch (error: any) {
      console.error("Error deleting all notifications:", error)
      toast({
        title: "Hata",
        description: "Bildirimler silinirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  function handleNotificationClick(notification: Notification) {
    // Mark as read
    if (!notification.is_read) {
      markAsRead(notification.id)
    }

    // Navigate based on notification type and related data
    if (notification.related_type && notification.related_id) {
      switch (notification.related_type) {
        case "order":
          router.push(`/seller/orders?id=${notification.related_id}`)
          break
        case "product":
          router.push(`/seller/products?id=${notification.related_id}`)
          break
        case "payout":
          router.push(`/seller/payouts?id=${notification.related_id}`)
          break
        default:
          // Do nothing for other types
          break
      }
    }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case "order":
        return <ShoppingBag className="h-5 w-5 text-blue-500" />
      case "payment":
        return <CreditCard className="h-5 w-5 text-green-500" />
      case "alert":
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  function formatDate(dateString: string) {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)

      // If the date is today
      if (date.toDateString() === now.toDateString()) {
        return `Bugün, ${format(date, "HH:mm")}`
      }
      // If the date is yesterday
      else if (date.toDateString() === yesterday.toDateString()) {
        return `Dün, ${format(date, "HH:mm")}`
      }
      // If the date is within the last 7 days
      else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
        return formatDistanceToNow(date, { addSuffix: true, locale: tr })
      }
      // Otherwise, show the full date
      else {
        return format(date, "d MMMM yyyy, HH:mm", { locale: tr })
      }
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString
    }
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

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <SellerSidebar />

      {/* Mobile Sidebar */}
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
        </SheetContent>
      </Sheet>

      <div className="flex-1 p-6 overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-gray-800 border-b p-4 flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Bildirimler</h1>
          <div className="w-6"></div> {/* Spacer for alignment */}
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bildirimler</h1>
              <p className="text-gray-500 dark:text-gray-400">
                Siparişler, ödemeler ve diğer önemli güncellemeler hakkında bildirimleriniz
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-2">
              <Button
                variant="outline"
                onClick={fetchNotifications}
                disabled={isRefreshing}
                className="flex items-center"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Yenile
              </Button>
              <Button variant="default" onClick={markAllAsRead} disabled={notifications.length === 0}>
                <CheckCheck className="mr-2 h-4 w-4" />
                Tümünü Okundu İşaretle
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={notifications.length === 0}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Tümünü Sil
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tüm bildirimleri sil</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tüm bildirimlerinizi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteAllNotifications} className="bg-red-500 hover:bg-red-600">
                      Tümünü Sil
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Bildirim ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tüm Bildirimler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Bildirimler</SelectItem>
                  <SelectItem value="order">Siparişler</SelectItem>
                  <SelectItem value="payment">Ödemeler</SelectItem>
                  <SelectItem value="alert">Uyarılar</SelectItem>
                  <SelectItem value="success">Başarılı İşlemler</SelectItem>
                  <SelectItem value="info">Bilgilendirmeler</SelectItem>
                </SelectContent>
              </Select>
              <Select value={readFilter} onValueChange={setReadFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Okunma Durumu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="unread">Okunmamış</SelectItem>
                  <SelectItem value="read">Okunmuş</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Bildirim Listesi</CardTitle>
              <CardDescription>
                Toplam {filteredNotifications.length} bildirim
                {typeFilter !== "all" || readFilter !== "all" || searchTerm ? " (filtreler uygulandı)" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center h-60">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                  <p className="text-lg font-medium text-gray-700">Bildirimler yükleniyor...</p>
                  <p className="text-sm text-gray-500">Lütfen bekleyin, bildirimleriniz hazırlanıyor.</p>
                </div>
              ) : filteredNotifications.length > 0 ? (
                <div className="space-y-4">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border ${
                        notification.is_read ? "bg-white" : "bg-blue-50 border-blue-200"
                      } hover:bg-gray-50 transition-colors cursor-pointer`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-base font-medium text-gray-900 truncate">{notification.title}</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{formatDate(notification.created_at)}</span>
                              {!notification.is_read && (
                                <Badge variant="default" className="bg-blue-500">
                                  Yeni
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`${
                                  notification.type === "order"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : notification.type === "payment"
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : notification.type === "alert"
                                        ? "bg-red-50 text-red-700 border-red-200"
                                        : notification.type === "success"
                                          ? "bg-green-50 text-green-700 border-green-200"
                                          : "bg-gray-50 text-gray-700 border-gray-200"
                                }`}
                              >
                                {notification.type === "order"
                                  ? "Sipariş"
                                  : notification.type === "payment"
                                    ? "Ödeme"
                                    : notification.type === "alert"
                                      ? "Uyarı"
                                      : notification.type === "success"
                                        ? "Başarılı"
                                        : notification.type === "info"
                                          ? "Bilgi"
                                          : "Genel"}
                              </Badge>
                              {notification.related_type && (
                                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                  {notification.related_type === "order"
                                    ? "Sipariş"
                                    : notification.related_type === "product"
                                      ? "Ürün"
                                      : notification.related_type === "payout"
                                        ? "Ödeme"
                                        : notification.related_type}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    markAsRead(notification.id)
                                  }}
                                >
                                  Okundu İşaretle
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteNotification(notification.id)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium">Bildirim bulunamadı</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {searchTerm || typeFilter !== "all" || readFilter !== "all"
                      ? "Arama kriterlerinize uygun bildirim bulunamadı. Filtreleri değiştirmeyi deneyin."
                      : "Henüz bildiriminiz bulunmuyor. Yeni siparişler ve ödemeler geldiğinde burada görünecektir."}
                  </p>
                  {(searchTerm || typeFilter !== "all" || readFilter !== "all") && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setSearchTerm("")
                        setTypeFilter("all")
                        setReadFilter("all")
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
    </div>
  )
}
