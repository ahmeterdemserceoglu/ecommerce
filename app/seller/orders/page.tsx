"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, AlertCircle, CheckCircle, TruckIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function SellerOrdersPage() {
  const router = useRouter()
  const auth = useAuth() as any
  const user = auth.user
  const authLoading = auth.loading
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])
  const [filteredOrders, setFilteredOrders] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentTab, setCurrentTab] = useState("all")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState("")
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [orderItemsLoading, setOrderItemsLoading] = useState(false)

  // Sipariş durumları
  const orderStatuses = [
    { value: "pending", label: "Beklemede" },
    { value: "paid", label: "Ödendi" },
    { value: "processing", label: "Hazırlanıyor" },
    { value: "shipped", label: "Kargoya Verildi" },
    { value: "delivered", label: "Teslim Edildi" },
    { value: "cancelled", label: "İptal Edildi" },
    { value: "refunded", label: "İade Edildi" },
  ]

  // Siparişleri getir
  useEffect(() => {
    if (!authLoading && user) {
      fetchOrders()
    } else if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, authLoading, router])

  // Siparişleri filtrele
  useEffect(() => {
    if (orders.length > 0) {
      let filtered = [...orders]

      // Arama filtresi
      if (searchTerm) {
        filtered = filtered.filter(
          (order) =>
            order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      }

      // Tab filtresi
      if (currentTab !== "all") {
        filtered = filtered.filter((order) => {
          if (currentTab === "pending") {
            return order.status === "pending" || order.status === "paid"
          } else if (currentTab === "processing") {
            return order.status === "processing" || order.status === "shipped"
          } else if (currentTab === "delivered") {
            return order.status === "delivered"
          } else if (currentTab === "cancelled") {
            return order.status === "cancelled" || order.status === "refunded"
          }
          return true
        })
      }

      setFilteredOrders(filtered)
    }
  }, [orders, searchTerm, currentTab])

  // Siparişleri getir
  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      // Satıcının mağazalarını bul
      const { data: storeData, error: storeError } = await supabase.from("stores").select("id").eq("user_id", user.id)

      if (storeError) throw new Error(storeError.message)

      if (!storeData || storeData.length === 0) {
        setOrders([])
        setLoading(false)
        return
      }

      const storeIds = storeData.map((store) => store.id)

      // Siparişleri getir (müşteri bilgisi olmadan)
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          status,
          payment_status,
          total_amount,
          tracking_number,
          user_id,
          address_full,
          order_note
        `)
        .in("store_id", storeIds)
        .order("created_at", { ascending: false })

      if (orderError) throw new Error(orderError.message)

      // Kullanıcı id'lerini topla
      const userIds = orderData.map((order) => order.user_id)
      // Kullanıcı bilgilerini çek (profiles tablosundan)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds)
      if (profileError) throw new Error(profileError.message)

      // Siparişleri müşteri bilgisiyle birleştir
      const formattedOrders = orderData.map((order) => {
        const profile = profileData.find((p) => p.id === order.user_id)
        return {
          id: order.id,
          created_at: new Date(order.created_at).toLocaleDateString("tr-TR"),
          status: order.status,
          payment_status: order.payment_status,
          total_amount: order.total_amount,
          tracking_number: order.tracking_number,
          customer_id: order.user_id,
          customer_name: profile?.full_name || "Bilinmeyen Müşteri",
          customer_email: profile?.email || "Bilinmeyen E-posta",
          address_full: order.address_full,
          order_note: order.order_note,
        }
      })

      setOrders(formattedOrders)
      setFilteredOrders(formattedOrders)
    } catch (err: any) {
      setError(err.message || "Siparişler yüklenirken bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  // Sipariş öğelerini getir
  const fetchOrderItems = async (orderId: string) => {
    try {
      setOrderItemsLoading(true)

      const { data, error } = await supabase
        .from("order_items")
        .select(`
          id,
          quantity,
          price,
          product_id,
          variant_id,
          products:product_id (name, slug, image_url),
          product_variants:variant_id (name)
        `)
        .eq("order_id", orderId)

      if (error) throw new Error(error.message)

      setOrderItems(data || [])
    } catch (err: any) {
      console.error("Sipariş öğeleri yüklenirken hata:", err)
    } finally {
      setOrderItemsLoading(false)
    }
  }

  // Sipariş durumunu güncelle
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdateLoading(true)
      setError(null)

      // Ödeme durumunu kontrol et
      if (newStatus !== "pending" && newStatus !== "cancelled") {
        const { data: orderData } = await supabase.from("orders").select("payment_status").eq("id", orderId).single()

        if (orderData?.payment_status !== "paid") {
          throw new Error("Bu işlem için ödemenin tamamlanmış olması gerekiyor")
        }
      }

      // Kargo takip numarası kontrolü
      if (newStatus === "shipped" && !trackingNumber) {
        throw new Error("Kargoya verildi durumu için kargo takip numarası gereklidir")
      }

      // Siparişi güncelle
      const updateData: any = { status: newStatus }

      // Kargo takip numarası varsa ekle
      if (trackingNumber) {
        updateData.tracking_number = trackingNumber
      }

      const { error: updateError } = await supabase.from("orders").update(updateData).eq("id", orderId)

      if (updateError) throw new Error(updateError.message)

      // Müşteriye bildirim gönder
      await sendOrderStatusNotification(orderId, newStatus)

      // Başarılı mesajı göster
      setSuccess("Sipariş durumu başarıyla güncellendi")

      // Siparişleri yenile
      fetchOrders()

      // Seçili siparişi kapat
      setSelectedOrder(null)
      setTrackingNumber("")
    } catch (err: any) {
      setError(err.message || "Sipariş durumu güncellenirken bir hata oluştu")
    } finally {
      setUpdateLoading(false)
    }
  }

  // Müşteriye bildirim gönder
  const sendOrderStatusNotification = async (orderId: string, status: string) => {
    try {
      const { data: orderData } = await supabase.from("orders").select("user_id").eq("id", orderId).single()

      if (!orderData?.user_id) return

      let title = ""
      let message = ""

      switch (status) {
        case "processing":
          title = "Siparişiniz Hazırlanıyor"
          message = `${orderId} numaralı siparişiniz hazırlanmaya başlandı.`
          break
        case "shipped":
          title = "Siparişiniz Kargoya Verildi"
          message = `${orderId} numaralı siparişiniz kargoya verildi. Kargo takip numarası: ${trackingNumber}`
          break
        case "delivered":
          title = "Siparişiniz Teslim Edildi"
          message = `${orderId} numaralı siparişiniz teslim edildi. Bizi tercih ettiğiniz için teşekkür ederiz.`
          break
        case "cancelled":
          title = "Siparişiniz İptal Edildi"
          message = `${orderId} numaralı siparişiniz iptal edildi.`
          break
        default:
          title = "Sipariş Durumu Güncellendi"
          message = `${orderId} numaralı siparişinizin durumu güncellendi.`
      }

      await supabase.from("notifications").insert({
        user_id: orderData.user_id,
        title,
        message,
        type: "order_status",
        reference_id: orderId,
        is_read: false,
      })
    } catch (err) {
      console.error("Bildirim gönderilirken hata:", err)
    }
  }

  // Sipariş durumu rozeti
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Beklemede
          </Badge>
        )
      case "paid":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Ödendi
          </Badge>
        )
      case "processing":
        return (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
            Hazırlanıyor
          </Badge>
        )
      case "shipped":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            Kargoya Verildi
          </Badge>
        )
      case "delivered":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Teslim Edildi
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            İptal Edildi
          </Badge>
        )
      case "refunded":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            İade Edildi
          </Badge>
        )
      default:
        return <Badge variant="outline">Bilinmiyor</Badge>
    }
  }

  // Ödeme durumu rozeti
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Beklemede
          </Badge>
        )
      case "paid":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Ödendi
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Başarısız
          </Badge>
        )
      case "refunded":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            İade Edildi
          </Badge>
        )
      default:
        return <Badge variant="outline">Bilinmiyor</Badge>
    }
  }

  // Sipariş detaylarını göster
  const handleViewOrder = (order: any) => {
    setSelectedOrder(order)
    fetchOrderItems(order.id)
  }

  // Sipariş öğesi için ürün görseli (thumbnail) veya placeholder
  const getProductImage = (item: any) => {
    const url = item.products?.image_url
    return (
      <img
        src={url || "/placeholder-product.png"}
        alt={item.products?.name || "Ürün görseli"}
        className="w-12 h-12 object-cover rounded mr-2 border"
        style={{ minWidth: 48, minHeight: 48 }}
      />
    )
  }

  if (authLoading) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container max-w-3xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Siparişlerim</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Hata</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Başarılı</AlertTitle>
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Sipariş ara..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Tabs defaultValue="all" value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">Tüm Siparişler</TabsTrigger>
              <TabsTrigger value="pending">Bekleyen</TabsTrigger>
              <TabsTrigger value="processing">İşleniyor</TabsTrigger>
              <TabsTrigger value="delivered">Teslim Edildi</TabsTrigger>
              <TabsTrigger value="cancelled">İptal/İade</TabsTrigger>
            </TabsList>

            <TabsContent value={currentTab}>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {searchTerm ? "Arama kriterlerine uygun sipariş bulunamadı." : "Henüz sipariş bulunmuyor."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sipariş No</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Müşteri</TableHead>
                        <TableHead>Tutar</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Ödeme</TableHead>
                        <TableHead>İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.id.substring(0, 8)}...</TableCell>
                          <TableCell>{order.created_at}</TableCell>
                          <TableCell>{order.customer_name}</TableCell>
                          <TableCell>₺{order.total_amount.toFixed(2)}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>{getPaymentStatusBadge(order.payment_status)}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => handleViewOrder(order)}>
                              Detaylar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Sipariş Detay Dialog */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Sipariş Detayları</DialogTitle>
              <DialogDescription>Sipariş No: {selectedOrder.id}</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Müşteri Bilgileri</h4>
                <p className="text-sm">{selectedOrder.customer_name}</p>
                <p className="text-sm">{selectedOrder.customer_email}</p>
                {/* Adres bilgisi */}
                {selectedOrder.address_full && (
                  <p className="text-sm mt-1">Adres: {selectedOrder.address_full}</p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Sipariş Bilgileri</h4>
                <p className="text-sm">Tarih: {selectedOrder.created_at}</p>
                <p className="text-sm">Tutar: ₺{selectedOrder.total_amount.toFixed(2)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm">Durum:</span>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm">Ödeme:</span>
                  {getPaymentStatusBadge(selectedOrder.payment_status)}
                </div>
                {selectedOrder.tracking_number && (
                  <p className="text-sm mt-1">Kargo Takip: {selectedOrder.tracking_number}</p>
                )}
                {/* Sipariş notu */}
                {selectedOrder.order_note && (
                  <p className="text-sm mt-1">Not: {selectedOrder.order_note}</p>
                )}
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Sipariş Öğeleri</h4>
              {orderItemsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                  <span className="text-sm">Yükleniyor...</span>
                </div>
              ) : orderItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sipariş öğeleri bulunamadı.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün</TableHead>
                      <TableHead>Varyant</TableHead>
                      <TableHead>Adet</TableHead>
                      <TableHead>Fiyat</TableHead>
                      <TableHead>Toplam</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center">
                            {getProductImage(item)}
                            <span>{item.products?.name || "Bilinmeyen Ürün"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{item.product_variants?.name || "-"}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₺{item.price.toFixed(2)}</TableCell>
                        <TableCell>₺{(item.price * item.quantity).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Sipariş Durumunu Güncelle</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  defaultValue={selectedOrder.status}
                  onValueChange={(value) => {
                    if (value === "shipped" && !trackingNumber) {
                      setTrackingNumber(selectedOrder.tracking_number || "")
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Durum seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {orderStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={() =>
                    updateOrderStatus(
                      selectedOrder.id,
                      (document.querySelector("[data-radix-select-value]") as HTMLElement)?.innerText ||
                        selectedOrder.status,
                    )
                  }
                  disabled={updateLoading}
                >
                  {updateLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Durumu Güncelle
                </Button>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Kargo Takip Numarası</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Kargo takip numarası"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      setUpdateLoading(true)
                      const { error } = await supabase
                        .from("orders")
                        .update({ tracking_number: trackingNumber })
                        .eq("id", selectedOrder.id)

                      if (error) throw new Error(error.message)

                      setSuccess("Kargo takip numarası güncellendi")
                      fetchOrders()
                    } catch (err: any) {
                      setError(err.message)
                    } finally {
                      setUpdateLoading(false)
                    }
                  }}
                  disabled={updateLoading || !trackingNumber}
                >
                  {updateLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TruckIcon className="h-4 w-4 mr-2" />
                  )}
                  Kaydet
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                Kapat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
