"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  AlertTriangle,
  Clipboard,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Plus,
  Menu,
  X,
  LogOut,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import SellerSidebar from "@/components/seller/seller-sidebar"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { signOut } from "next-auth/react"

// Para birimi formatı için yardımcı fonksiyon
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(value)
}

// Linter hatalarını çözmek için tip tanımları
type StatsCardProps = {
  title: string
  value: string
  icon: React.ReactNode
  trend?: number
  description?: string
}

type OrderType = {
  id: string
  order_number: string
  total_amount: number
  status: string
  created_at: string
  payment_status: string
  store_id: string
  updated_at: string
  user_id?: string // Müşteri ID'si, nullable olarak ekledik
}

type DashboardData = {
  totalSales: number
  totalOrders: number
  totalProducts: number
  totalCustomers: number
  recentOrders: OrderType[]
  topProducts: any[]
  lowStockProducts: any[]
  todaySales: number
  weekSales: number
  monthSales: number
  salesGrowth: number
  salesByDay: { date: string; amount: number }[]
  pendingApprovals: number
  rejectedProducts: number
  lowStockVariants: any[]
}

const menu = [
  { href: "/seller/dashboard", label: "Panel", icon: DollarSign },
  { href: "/seller/products", label: "Ürünler", icon: ShoppingBag },
  { href: "/seller/orders", label: "Siparişler", icon: Package },
]

export default function SellerDashboard() {
  const router = useRouter()
  const pathname = usePathname()
  const auth = useAuth() as any
  const user = auth.user
  const authLoading = auth.loading
  const refreshSession = auth.refreshSession
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("weekly")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    recentOrders: [],
    topProducts: [],
    lowStockProducts: [],
    todaySales: 0,
    weekSales: 0,
    monthSales: 0,
    salesGrowth: 0,
    salesByDay: [],
    pendingApprovals: 0,
    rejectedProducts: 0,
    lowStockVariants: [],
  })
  const supabase = createClientComponentClient()
  const triedRefresh = useRef(false)
  const [productStatusUpdates, setProductStatusUpdates] = useState<any[]>([])
  const [showProductStatus, setShowProductStatus] = useState(true)

  // fetchDashboardData fonksiyonunu useEffect dışına taşı
  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", user?.id)
        .single()
      if (storeError) throw storeError
      const storeId = storeData?.id

      // Toplam ürün
      const { count: productCount } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("is_active", true)
        .eq("is_approved", true)

      // Onay bekleyen ürünler (is_approved IS NULL)
      const { count: pendingCount } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .is("is_approved", null)

      // Reddedilen ürünler (is_approved = false)
      const { count: rejectedCount } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("is_approved", false)

      // Son siparişler
      const { data: recentOrdersData } = await supabase
        .from("orders")
        .select("id, order_number, total_amount, status, created_at, payment_status, store_id, updated_at, user_id")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(5)

      const recentOrders = (recentOrdersData as OrderType[]) || []

      // Toplam müşteri sayısı hesaplaması
      const totalCustomers =
        recentOrders.length > 0
          ? new Set(recentOrders.filter((order) => order.user_id).map((order) => order.user_id)).size
          : 0

      // En çok satan ürünler
      const { data: topProducts } = await supabase
        .from("products")
        .select("id, name, price, sales_count, stock_quantity, is_active, store_id, created_at, updated_at")
        .eq("store_id", storeId)
        .order("sales_count", { ascending: false })
        .limit(5)

      // Mağazanın tüm ürünlerini çek
      const { data: allProducts } = await supabase
        .from("products")
        .select("id, name, has_variants, price, stock_quantity")
        .eq("store_id", storeId)
      // Sadece varyantı olmayan ürünler için düşük stok
      const lowStockProducts = (allProducts || [])
        .filter((p) => !p.has_variants && p.stock_quantity < 10)
        .map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          stock_quantity: p.stock_quantity,
        }))
      // Varyantlı ürünlerin id'lerini bul
      const variantProductIds = (allProducts || []).filter((p) => p.has_variants).map((p) => p.id)
      let lowStockVariants: any[] = []
      if (variantProductIds.length > 0) {
        // Bu ürünlerin varyantlarını çek
        const { data: allVariants } = await supabase
          .from("product_variants")
          .select("id, name, stock_quantity, product_id")
          .in("product_id", variantProductIds)
        // Stoğu 3 veya daha az olanları bul
        lowStockVariants = (allVariants || [])
          .filter((v) => v.stock_quantity <= 3)
          .map((v) => {
            const product = (allProducts || []).find((p) => p.id === v.product_id)
            return {
              ...v,
              product_name: product?.name || "",
            }
          })
      }

      // Bugünün tarihi
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Son 7 gün
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      weekAgo.setHours(0, 0, 0, 0)

      // Son 30 gün
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)
      monthAgo.setHours(0, 0, 0, 0)

      // Günlük/Haftalık/Aylık satışlar
      const { data: todaySalesData } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("store_id", storeId)
        .gte("created_at", today.toISOString())

      const { data: weekSalesData } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("store_id", storeId)
        .gte("created_at", weekAgo.toISOString())

      const { data: monthSalesData } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("store_id", storeId)
        .gte("created_at", monthAgo.toISOString())

      // Önceki hafta ile karşılaştırma için
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      twoWeeksAgo.setHours(0, 0, 0, 0)

      const { data: previousWeekSalesData } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("store_id", storeId)
        .gte("created_at", twoWeeksAgo.toISOString())
        .lt("created_at", weekAgo.toISOString())

      // Son 7 gün için günlük satış verileri
      const last7days = Array(7)
        .fill(0)
        .map((_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - i)
          date.setHours(0, 0, 0, 0)
          return date
        })
        .reverse()

      const dailySalesPromises = last7days.map(async (date) => {
        const nextDay = new Date(date)
        nextDay.setDate(nextDay.getDate() + 1)

        const { data: dailySales } = await supabase
          .from("orders")
          .select("total_amount")
          .eq("store_id", storeId)
          .gte("created_at", date.toISOString())
          .lt("created_at", nextDay.toISOString())

        const totalAmount = dailySales?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0

        return {
          date: date.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" }),
          amount: totalAmount,
        }
      })

      const salesByDay = await Promise.all(dailySalesPromises)

      // Toplam rakamları hesapla
      const todaySales = todaySalesData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
      const weekSales = weekSalesData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
      const monthSales = monthSalesData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
      const previousWeekSales = previousWeekSalesData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0

      // Büyüme oranı
      const salesGrowth = previousWeekSales === 0 ? 100 : ((weekSales - previousWeekSales) / previousWeekSales) * 100

      // Son 5 onaylanan veya reddedilen ürünü çek
      const { data: statusUpdates } = await supabase
        .from("products")
        .select("id, name, is_approved, reject_reason, updated_at")
        .eq("store_id", storeId)
        .not("is_approved", "is", null)
        .order("updated_at", { ascending: false })
        .limit(5)
      setProductStatusUpdates(statusUpdates || [])

      setDashboardData({
        totalSales: monthSales,
        totalOrders: recentOrders.length,
        totalProducts: productCount || 0,
        totalCustomers,
        recentOrders,
        topProducts: topProducts || [],
        lowStockProducts,
        todaySales,
        weekSales,
        monthSales,
        salesGrowth,
        salesByDay,
        pendingApprovals: pendingCount || 0,
        rejectedProducts: rejectedCount || 0,
        lowStockVariants,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Hata",
        description: "Veriler yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/auth/login?returnTo=/seller/dashboard")
      return
    }
    if (user.role !== "seller") {
      if (!triedRefresh.current && typeof refreshSession === "function") {
        triedRefresh.current = true
        refreshSession().then(() => {
          if (user.role !== "seller") {
            router.push("/hesabim")
          }
        })
      } else {
        router.push("/hesabim")
      }
      return
    }
    fetchDashboardData()
  }, [user, authLoading, refreshSession])

  useEffect(() => {
    const closed = typeof window !== "undefined" && localStorage.getItem("hideProductStatusPanel")
    if (closed === "1") setShowProductStatus(false)
  }, [])

  const handleCloseProductStatus = () => {
    setShowProductStatus(false)
    if (typeof window !== "undefined") localStorage.setItem("hideProductStatusPanel", "1")
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Satıcı paneli yükleniyor...</p>
          <p className="text-sm text-gray-500">Lütfen bekleyin, verileriniz hazırlanıyor.</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== "seller") {
    return null
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
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
            <nav className="px-2 space-y-1">
              {menu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${pathname === item.href
                    ? "bg-gray-100 dark:bg-gray-700 text-primary"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  <span>{item.label}</span>
                </Link>
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

      <main className="flex-1 p-6 overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-gray-800 border-b p-4 flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Satıcı Panel</h1>
          <div className="w-6"></div> {/* Spacer for alignment */}
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Merhaba, Satıcı</h1>
              <p className="text-gray-500 dark:text-gray-400">İşletmenize genel bakış ve güncel durumu görüntüleyin</p>
            </div>
            <div className="mt-4 md:mt-0 space-x-3">
              <Button variant="outline" size="sm" onClick={() => fetchDashboardData()}>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Yenile</span>
                </div>
              </Button>
              <Button asChild size="sm">
                <Link href="/seller/products/new">
                  <div className="flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    <span>Yeni Ürün</span>
                  </div>
                </Link>
              </Button>
            </div>
          </div>

          {showProductStatus && productStatusUpdates.length > 0 && (
            <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20 relative">
              <button
                onClick={handleCloseProductStatus}
                className="absolute right-2 top-2 text-xl text-blue-500 hover:text-blue-700"
              >
                ×
              </button>
              <CardContent className="p-4">
                <div className="flex items-center mb-2">
                  <Clipboard className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="font-semibold text-blue-800 dark:text-blue-200">Ürün Durum Bildirimleri</span>
                </div>
                <ul className="space-y-2">
                  {productStatusUpdates.map((product) => (
                    <li key={product.id} className="flex items-center gap-2">
                      <span className="font-medium">{product.name}</span>
                      {product.is_approved === true && <Badge variant="default">Onaylandı</Badge>}
                      {product.is_approved === false && product.reject_reason && (
                        <Badge variant="destructive">Reddedildi</Badge>
                      )}
                      {product.is_approved === false && product.reject_reason && (
                        <span className="text-xs text-gray-500 ml-2">Sebep: {product.reject_reason}</span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(product.updated_at).toLocaleString("tr-TR")}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {dashboardData.pendingApprovals > 0 && (
            <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                  <p className="text-amber-800 dark:text-amber-200">
                    {dashboardData.pendingApprovals} ürününüz onay bekliyor. Onaylandıktan sonra satışa sunulacaktır.
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/seller/products?filter=pending">Görüntüle</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {dashboardData.rejectedProducts > 0 && (
            <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-800 dark:text-red-200">
                    {dashboardData.rejectedProducts} ürününüz reddedildi. Düzenleyip tekrar onaya gönderebilirsiniz.
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/seller/products?filter=rejected">Görüntüle</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Ana İstatistikler */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatsCard
              title="Toplam Satış"
              value={formatCurrency(dashboardData.totalSales)}
              icon={<DollarSign className="w-8 h-8 text-blue-500" />}
              trend={dashboardData.salesGrowth}
              description="Bu ayki toplam satış"
            />
            <StatsCard
              title="Siparişler"
              value={dashboardData.totalOrders.toString()}
              icon={<ShoppingBag className="w-8 h-8 text-green-500" />}
              description="Toplam sipariş sayısı"
              trend={undefined}
            />
            <StatsCard
              title="Ürünler"
              value={dashboardData.totalProducts.toString()}
              icon={<Package className="w-8 h-8 text-purple-500" />}
              description="Aktif ve onaylı ürün sayısı"
              trend={undefined}
            />
            <StatsCard
              title="Müşteriler"
              value={dashboardData.totalCustomers.toString()}
              icon={<Users className="w-8 h-8 text-amber-500" />}
              description="Toplam müşteri sayısı"
              trend={undefined}
            />
          </div>

          {/* Satış Zaman Aralıkları */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Bugünkü Satış</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dashboardData.todaySales)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Haftalık Satış</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dashboardData.weekSales)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Aylık Satış</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dashboardData.monthSales)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Satış Grafiği ve Stok Uyarıları */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Satış Trendi</CardTitle>
                <CardDescription>Son 7 gündeki satış performansınız</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  {dashboardData.salesByDay.length > 0 ? (
                    <div className="w-full h-full relative">
                      {/* Burada Chart.js veya benzeri bir kütüphane kullanılabilir */}
                      <div className="absolute inset-0 flex items-end justify-between px-2">
                        {dashboardData.salesByDay.map((day, index) => (
                          <div key={index} className="flex flex-col items-center">
                            <div
                              className="bg-blue-500 w-10 rounded-t-md"
                              style={{
                                height: `${Math.max(30, (day.amount / Math.max(...dashboardData.salesByDay.map((d) => d.amount))) * 200)}px`,
                              }}
                            ></div>
                            <div className="text-xs mt-2">{day.date}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500">Grafik verisi yükleniyor veya henüz satış bulunmuyor.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span>Stok Uyarıları</span>
                </CardTitle>
                <CardDescription>Stok miktarı düşük ürünler</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData.lowStockProducts.length > 0 ? (
                  <ul className="space-y-3">
                    {dashboardData.lowStockProducts.map((product) => (
                      <li key={product.id} className="flex justify-between items-center border-b pb-2">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-500">{formatCurrency(product.price)}</p>
                        </div>
                        <Badge variant={product.stock_quantity <= 3 ? "destructive" : "outline"} className="ml-auto">
                          {product.stock_quantity} adet
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>Düşük stoklu ürün bulunmuyor</p>
                  </div>
                )}
                {dashboardData.lowStockVariants.length > 0 && (
                  <ul className="space-y-2 mt-2">
                    {dashboardData.lowStockVariants.map((v) => (
                      <li key={v.id} className="flex items-center gap-2 text-sm text-red-600">
                        <span className="font-medium">{v.product_name}</span>
                        <span>-</span>
                        <span className="font-medium">{v.name}</span>
                        <span>({v.stock_quantity} adet)</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" asChild size="sm" className="w-full">
                  <Link href="/seller/products">Tüm Ürünleri Görüntüle</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Son Siparişler ve En Çok Satanlar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Son Siparişler</CardTitle>
                <CardDescription>En son gelen siparişler</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData.recentOrders.length > 0 ? (
                  <ul className="space-y-4">
                    {dashboardData.recentOrders.map((order) => (
                      <li key={order.id} className="flex justify-between border-b pb-3">
                        <div>
                          <div className="font-medium">#{order.order_number}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleDateString("tr-TR")}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(order.total_amount)}</div>
                          <div>
                            <Badge
                              variant={
                                order.status === "completed"
                                  ? "default"
                                  : order.status === "processing"
                                    ? "outline"
                                    : order.status === "cancelled"
                                      ? "destructive"
                                      : "secondary"
                              }
                            >
                              {order.status === "completed"
                                ? "Tamamlandı"
                                : order.status === "processing"
                                  ? "İşleniyor"
                                  : order.status === "cancelled"
                                    ? "İptal Edildi"
                                    : order.status}
                            </Badge>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    <Clipboard className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Henüz sipariş bulunmuyor</p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" asChild size="sm" className="w-full">
                  <Link href="/seller/orders">Tüm Siparişleri Görüntüle</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>En Çok Satan Ürünler</CardTitle>
                <CardDescription>Satış performansı yüksek ürünleriniz</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData.topProducts.length > 0 ? (
                  <ul className="space-y-4">
                    {dashboardData.topProducts.map((product) => (
                      <li key={product.id} className="flex justify-between border-b pb-3">
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">{formatCurrency(product.price)}</div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="font-medium">{product.sales_count || 0} satış</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Henüz satış bulunmuyor</p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" asChild size="sm" className="w-full">
                  <Link href="/seller/products">Tüm Ürünleri Görüntüle</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

// İstatistik Kartı Bileşeni
function StatsCard({ title, value, icon, trend, description }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            {trend !== undefined && (
              <div className={`flex items-center mt-1 ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                {trend >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                <span className="text-sm font-medium">{Math.abs(trend).toFixed(1)}%</span>
              </div>
            )}
            {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
          </div>
          <div className="p-3 bg-gray-50 rounded-full">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}
