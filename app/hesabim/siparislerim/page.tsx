"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Package, Clock, ChevronRight, Search, Filter, AlertCircle } from "lucide-react"
import AccountSidebar from "@/components/account/account-sidebar"

export default function OrdersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      if (authLoading) return
      if (!user) {
        router.push("/giris?returnTo=/hesabim/siparislerim")
        return
      }

      setLoading(true)
      try {
        // 1. Siparişleri çek
        const { data: orders, error: ordersError } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (ordersError) throw ordersError

        // 2. Sipariş id'lerini al
        const orderIds = (orders || []).map((order: any) => order.id)

        // 3. order_items'ı topluca çek
        let orderItems: any[] = []
        if (orderIds.length > 0) {
          const { data: items, error: itemsError } = await supabase
            .from("order_items")
            .select("*")
            .in("order_id", orderIds)

          if (itemsError) throw itemsError
          orderItems = items || []
        }

        // 4. Siparişlere order_items ekle
        const ordersWithItems = (orders || []).map((order: any) => ({
          ...order,
          order_items: orderItems.filter((item) => item.order_id === order.id),
        }))

        setOrders(ordersWithItems)
      } catch (error) {
        console.error("Siparişler yüklenirken hata:", error, JSON.stringify(error))
        toast({
          title: "Hata",
          description: `Siparişleriniz yüklenirken bir hata oluştu. Detay: ${typeof error === "object" ? JSON.stringify(error) : error}`,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [user, authLoading, router, toast])

  // Sipariş durumuna göre renk ve metin belirle
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-700">
            Beklemede
          </Badge>
        )
      case "paid":
        return (
          <Badge variant="outline" className="border-green-500 text-green-700">
            Ödendi
          </Badge>
        )
      case "processing":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-700">
            İşleniyor
          </Badge>
        )
      case "shipped":
        return (
          <Badge variant="outline" className="border-purple-500 text-purple-700">
            Kargoda
          </Badge>
        )
      case "delivered":
        return (
          <Badge variant="outline" className="border-green-500 text-green-700">
            Teslim Edildi
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="border-red-500 text-red-700">
            İptal Edildi
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Ödeme durumuna göre renk ve metin belirle
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-700">
            Beklemede
          </Badge>
        )
      case "processing":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-700">
            İşleniyor
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="border-green-500 text-green-700">
            Tamamlandı
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="outline" className="border-red-500 text-red-700">
            Başarısız
          </Badge>
        )
      case "refunded":
        return (
          <Badge variant="outline" className="border-purple-500 text-purple-700">
            İade Edildi
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Tarihi formatla
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  // Sekmeye göre siparişleri filtrele
  const filterOrdersByTab = (orders: any[], tab: string) => {
    switch (tab) {
      case "pending":
        // "paid" durumundaki siparişleri de "bekleyen" sekmesinde göster
        return orders.filter((order) => order.status === "pending" || order.status === "paid")
      case "processing":
        return orders.filter((order) => order.status === "processing")
      case "shipped":
        return orders.filter((order) => order.status === "shipped")
      case "delivered":
        return orders.filter((order) => order.status === "delivered")
      default:
        return orders
    }
  }

  // Aktif sekmeyi state olarak tut
  const [activeTab, setActiveTab] = useState("all")

  // Siparişin ödenebilir olup olmadığını kontrol eden yardımcı fonksiyon
  const isOrderPayable = (order: any) => {
    return order.status === "pending" || order.payment_status === "pending";
  };

  if (loading || authLoading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/4">
            <AccountSidebar />
          </div>
          <div className="w-full md:w-3/4">
            <h1 className="text-2xl font-bold mb-6">Siparişlerim</h1>
            <div className="flex justify-center py-10">
              <p>Yükleniyor...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/4">
          <AccountSidebar />
        </div>
        <div className="w-full md:w-3/4">
          <h1 className="text-2xl font-bold mb-6">Siparişlerim</h1>

          <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="all" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">Tüm Siparişler</TabsTrigger>
              <TabsTrigger value="pending">Bekleyen</TabsTrigger>
              <TabsTrigger value="processing">İşleniyor</TabsTrigger>
              <TabsTrigger value="shipped">Kargoda</TabsTrigger>
              <TabsTrigger value="delivered">Teslim Edildi</TabsTrigger>
            </TabsList>

            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-muted-foreground">Toplam {orders.length} sipariş bulundu</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtrele
                </Button>
                <Button variant="outline" size="sm">
                  <Search className="h-4 w-4 mr-2" />
                  Ara
                </Button>
              </div>
            </div>

            <TabsContent value="all">
              {orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50 py-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">Sipariş #{order.order_number}</CardTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(order.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                              <span className="font-medium">{order.total_amount != null ? order.total_amount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" }) : "-"} ₺</span>
                              <span className="text-xs text-muted-foreground">{order.order_items.length} ürün</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(order.status)}
                              {getPaymentStatusBadge(order.payment_status)}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {order.order_items.slice(0, 2).map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{item.product_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.quantity} adet x {item.price != null ? item.price.toLocaleString("tr-TR", { style: "currency", currency: "TRY" }) : "-"} ₺
                                </p>
                              </div>
                              <div className="text-sm">{getStatusBadge(item.status)}</div>
                            </div>
                          ))}
                          {order.order_items.length > 2 && (
                            <p className="text-sm text-muted-foreground">
                              + {order.order_items.length - 2} daha fazla ürün
                            </p>
                          )}
                        </div>
                        <Separator className="my-3" />
                        <div className="flex justify-between gap-2 flex-wrap">
                          <Button variant="link" className="p-0 h-auto" asChild>
                            <Link href={`/hesabim/siparislerim/${order.id}`}>
                              Sipariş Detayları
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                          </Button>
                          <div className="flex gap-2">
                            {isOrderPayable(order) && (
                              <Button variant="default" size="sm" onClick={() => router.push(`/odeme?siparis=${order.id}`)}>
                                Ödeme Yap
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              Yardım Al
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Henüz siparişiniz bulunmuyor</h3>
                    <p className="text-muted-foreground text-center mb-4">Siparişleriniz burada görüntülenecektir.</p>
                    <Button asChild>
                      <Link href="/">Alışverişe Başla</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Diğer sekmeler için filtreli görünüm */}
            <TabsContent value="pending">
              {filterOrdersByTab(orders, "pending").length > 0 ? (
                <div className="space-y-4">
                  {filterOrdersByTab(orders, "pending").map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50 py-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">Sipariş #{order.order_number}</CardTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(order.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                              <span className="font-medium">{order.total_amount != null ? order.total_amount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" }) : "-"} ₺</span>
                              <span className="text-xs text-muted-foreground">{order.order_items.length} ürün</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(order.status)}
                              {getPaymentStatusBadge(order.payment_status)}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {order.order_items.slice(0, 2).map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{item.product_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.quantity} adet x {item.price != null ? item.price.toLocaleString("tr-TR", { style: "currency", currency: "TRY" }) : "-"} ₺
                                </p>
                              </div>
                              <div className="text-sm">{getStatusBadge(item.status)}</div>
                            </div>
                          ))}
                          {order.order_items.length > 2 && (
                            <p className="text-sm text-muted-foreground">
                              + {order.order_items.length - 2} daha fazla ürün
                            </p>
                          )}
                        </div>
                        <Separator className="my-3" />
                        <div className="flex justify-between gap-2 flex-wrap">
                          <Button variant="link" className="p-0 h-auto" asChild>
                            <Link href={`/hesabim/siparislerim/${order.id}`}>
                              Sipariş Detayları
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                          </Button>
                          <div className="flex gap-2">
                            {isOrderPayable(order) && (
                              <Button variant="default" size="sm" onClick={() => router.push(`/odeme?siparis=${order.id}`)}>
                                Ödeme Yap
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              Yardım Al
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Bekleyen siparişiniz bulunmuyor</h3>
                    <p className="text-muted-foreground text-center">
                      Bekleyen siparişleriniz burada görüntülenecektir.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="processing">
              {filterOrdersByTab(orders, "processing").length > 0 ? (
                <div className="space-y-4">
                  {filterOrdersByTab(orders, "processing").map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50 py-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">Sipariş #{order.order_number}</CardTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(order.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                              <span className="font-medium">{order.total_amount != null ? order.total_amount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" }) : "-"} ₺</span>
                              <span className="text-xs text-muted-foreground">{order.order_items.length} ürün</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(order.status)}
                              {getPaymentStatusBadge(order.payment_status)}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {order.order_items.slice(0, 2).map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{item.product_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.quantity} adet x {item.price != null ? item.price.toLocaleString("tr-TR", { style: "currency", currency: "TRY" }) : "-"} ₺
                                </p>
                              </div>
                              <div className="text-sm">{getStatusBadge(item.status)}</div>
                            </div>
                          ))}
                          {order.order_items.length > 2 && (
                            <p className="text-sm text-muted-foreground">
                              + {order.order_items.length - 2} daha fazla ürün
                            </p>
                          )}
                        </div>
                        <Separator className="my-3" />
                        <div className="flex justify-between">
                          <Button variant="link" className="p-0 h-auto" asChild>
                            <Link href={`/hesabim/siparislerim/${order.id}`}>
                              Sipariş Detayları
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm">
                            Yardım Al
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">İşleniyor siparişiniz bulunmuyor</h3>
                    <p className="text-muted-foreground text-center">
                      İşleniyor siparişleriniz burada görüntülenecektir.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="shipped">
              {filterOrdersByTab(orders, "shipped").length > 0 ? (
                <div className="space-y-4">
                  {filterOrdersByTab(orders, "shipped").map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50 py-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">Sipariş #{order.order_number}</CardTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(order.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                              <span className="font-medium">{order.total_amount != null ? order.total_amount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" }) : "-"} ₺</span>
                              <span className="text-xs text-muted-foreground">{order.order_items.length} ürün</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(order.status)}
                              {getPaymentStatusBadge(order.payment_status)}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {order.order_items.slice(0, 2).map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{item.product_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.quantity} adet x {item.price != null ? item.price.toLocaleString("tr-TR", { style: "currency", currency: "TRY" }) : "-"} ₺
                                </p>
                              </div>
                              <div className="text-sm">{getStatusBadge(item.status)}</div>
                            </div>
                          ))}
                          {order.order_items.length > 2 && (
                            <p className="text-sm text-muted-foreground">
                              + {order.order_items.length - 2} daha fazla ürün
                            </p>
                          )}
                        </div>
                        <Separator className="my-3" />
                        <div className="flex justify-between">
                          <Button variant="link" className="p-0 h-auto" asChild>
                            <Link href={`/hesabim/siparislerim/${order.id}`}>
                              Sipariş Detayları
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm">
                            Yardım Al
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Kargoda siparişiniz bulunmuyor</h3>
                    <p className="text-muted-foreground text-center">
                      Kargoda siparişleriniz burada görüntülenecektir.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="delivered">
              {filterOrdersByTab(orders, "delivered").length > 0 ? (
                <div className="space-y-4">
                  {filterOrdersByTab(orders, "delivered").map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50 py-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">Sipariş #{order.order_number}</CardTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(order.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                              <span className="font-medium">{order.total_amount != null ? order.total_amount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" }) : "-"} ₺</span>
                              <span className="text-xs text-muted-foreground">{order.order_items.length} ürün</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(order.status)}
                              {getPaymentStatusBadge(order.payment_status)}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {order.order_items.slice(0, 2).map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{item.product_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.quantity} adet x {item.price != null ? item.price.toLocaleString("tr-TR", { style: "currency", currency: "TRY" }) : "-"} ₺
                                </p>
                              </div>
                              <div className="text-sm">{getStatusBadge(item.status)}</div>
                            </div>
                          ))}
                          {order.order_items.length > 2 && (
                            <p className="text-sm text-muted-foreground">
                              + {order.order_items.length - 2} daha fazla ürün
                            </p>
                          )}
                        </div>
                        <Separator className="my-3" />
                        <div className="flex justify-between">
                          <Button variant="link" className="p-0 h-auto" asChild>
                            <Link href={`/hesabim/siparislerim/${order.id}`}>
                              Sipariş Detayları
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm">
                            Yardım Al
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Teslim edilen siparişiniz bulunmuyor</h3>
                    <p className="text-muted-foreground text-center">
                      Teslim edilen siparişleriniz burada görüntülenecektir.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
