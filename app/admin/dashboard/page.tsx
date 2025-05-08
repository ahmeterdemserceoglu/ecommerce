"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  Store,
  ShoppingBag,
  DollarSign,
  Settings,
  AlertCircle,
  LayoutDashboard,
  LogOut,
  Bell,
  Tag,
  Database,
  FileText,
  Menu,
  X,
  Loader2,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Sheet, SheetContent } from "@/components/ui/sheet"

// Import the CleanProductsButton component
import { CleanProductsButton } from "./clean-products"

export default function AdminDashboard() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const { user, loading: userLoading, signOut } = useAuth()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [stats, setStats] = useState({
    userCount: 0,
    storeCount: 0,
    productCount: 0,
    revenue: 0,
    pendingApplications: 0,
  })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [payouts, setPayouts] = useState([])
  const pathname = usePathname()

  // Admin yetkisi kontrolü
  useEffect(() => {
    let isMounted = true
    let authCheckTimeout: NodeJS.Timeout

    const checkAdminAuth = async () => {
      try {
        if (retryCount >= 5) {
          if (isMounted) {
            setError("Yetki kontrolü yapılamadı. Lütfen tekrar giriş yapın.")
            setIsCheckingAuth(false)
          }
          return
        }

        // Kullanıcı henüz yüklenmemişse, bekleyin
        if (userLoading) {
          authCheckTimeout = setTimeout(() => {
            if (isMounted) {
              setRetryCount((prev) => prev + 1)
              checkAdminAuth()
            }
          }, 1000)
          return
        }

        // Kullanıcı yoksa ana sayfaya yönlendir
        if (!user) {
          router.push("/auth/login?returnTo=/admin/dashboard")
          return
        }

        // Kullanıcı admin değilse ana sayfaya yönlendir
        if (user.role !== "admin") {
          console.error("Bu sayfaya erişim yetkiniz yok. Rol:", user.role)
          router.push("/")
          return
        }

        // Ek güvenlik kontrolü için veritabanından yetki doğrula
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()

        if (profileError) {
          console.error("Profil verisi alınamadı:", profileError)
          if (isMounted) {
            setRetryCount((prev) => prev + 1)
            authCheckTimeout = setTimeout(checkAdminAuth, 1000)
          }
          return
        }

        if (profileData.role !== "admin") {
          console.error("Yetki hatası: Veritabanı rolü admin değil:", profileData.role)
          router.push("/")
          return
        }

        // Tüm kontroller başarılı, admin sayfasını yükle
        if (isMounted) {
          setIsCheckingAuth(false)
          setAuthChecked(true)
          loadDashboardData()
        }
      } catch (error) {
        console.error("Admin yetkisi kontrol edilirken hata oluştu:", error)
        if (isMounted) {
          setRetryCount((prev) => prev + 1)
          authCheckTimeout = setTimeout(checkAdminAuth, 1000)
        }
      }
    }

    checkAdminAuth()

    return () => {
      isMounted = false
      if (authCheckTimeout) clearTimeout(authCheckTimeout)
    }
  }, [user, userLoading, router, retryCount, supabase, signOut])

  // Dashboard verilerini yükle
  const loadDashboardData = async () => {
    try {
      // Dashboard verilerini yükle (ör: istatistikler, son siparişler, vs.)
      // const { data: stats } = await supabase.from('stats').select('*')
      // const { data: orders } = await supabase.from('orders').select('*').limit(5)

      // Veri yükleme simülasyonu (gerçek verilerle değiştirilecek)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setLoadingData(false)
    } catch (error) {
      console.error("Dashboard verileri yüklenirken hata oluştu:", error)
      setError("Veriler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.")
      setLoadingData(false)
    }
  }

  useEffect(() => {
    fetchPayouts()
  }, [])

  const fetchPayouts = async () => {
    const res = await fetch("/api/admin/payouts")
    const data = await res.json()
    setPayouts(data.payouts || [])
  }

  // Hata durumunda göster
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg max-w-md">
          <h2 className="text-lg font-bold mb-2">Bir Hata Oluştu</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg">
            Sayfayı Yenile
          </button>
        </div>
      </div>
    )
  }

  // Yüklenme durumunda göster - özelleştirilmiş loading ekranı
  if (isCheckingAuth || loadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 text-orange-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold mb-2">
          {isCheckingAuth ? "Yetki kontrol ediliyor..." : "Admin Paneli Yükleniyor..."}
        </h2>
        <p className="text-gray-500 max-w-md text-center">
          {isCheckingAuth
            ? "Admin yetkiniz kontrol ediliyor, lütfen bekleyin."
            : "Dashboard verileri hazırlanıyor, bu işlem birkaç saniye sürebilir."}
        </p>
        {retryCount > 2 && (
          <p className="text-amber-600 mt-4 max-w-md text-center">
            Bu işlem beklenenden uzun sürüyor. Lütfen bekleyin veya sayfayı yenileyin.
          </p>
        )}
        <div className="mt-6 h-2 w-64 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all duration-300 ease-in-out"
            style={{ width: `${Math.min((retryCount + 1) * 20, 100)}%` }}
          ></div>
        </div>
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
    {
      icon: <AlertCircle className="h-5 w-5" />,
      label: "Satıcı Başvuruları",
      href: "/admin/panel/satici-basvurulari",
      badge: stats.pendingApplications,
      
    },
    { icon: <DollarSign className="h-5 w-5" />, label: "Ödeme Talepleri", href: "/admin/payouts" },
    { icon: <FileText className="h-5 w-5" />, label: "Siparişler", href: "/admin/orders" },
    { icon: <Database className="h-5 w-5" />, label: "Veritabanı", href: "/admin/database" },
    { icon: <Settings className="h-5 w-5" />, label: "Ayarlar", href: "/admin/settings" },
    
  ]

  const approvePayout = async (id: string) => {
    await fetch(`/api/admin/payouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    fetchPayouts()
  }

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
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                  pathname === item.href
                    ? "bg-gray-100 dark:bg-gray-700 text-primary"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
                {item.badge ? (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">{item.badge}</span>
                ) : null}
              </Link>
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
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                    pathname === item.href
                      ? "bg-gray-100 dark:bg-gray-700 text-primary"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                  {item.badge ? (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">{item.badge}</span>
                  ) : null}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-gray-800 border-b p-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <div className="w-6"></div> {/* Spacer for alignment */}
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Dashboard</h1>

              {stats.pendingApplications > 0 && (
                <Link href="/admin/panel/satici-basvurulari">
                  <Button variant="outline" className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span>{stats.pendingApplications} Bekleyen Başvuru</span>
                  </Button>
                </Link>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Kullanıcılar</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.userCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aktif Mağazalar</CardTitle>
                  <Store className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.storeCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Ürünler</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.productCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Platform Geliri</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₺{stats.revenue.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="users" className="mt-6">
              <TabsList>
                <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
                <TabsTrigger value="sellers">Satıcılar</TabsTrigger>
                <TabsTrigger value="stores">Mağazalar</TabsTrigger>
                <TabsTrigger value="products">Ürünler</TabsTrigger>
                <TabsTrigger value="orders">Siparişler</TabsTrigger>
                <TabsTrigger value="payouts">Ödeme Talepleri</TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Kullanıcı Yönetimi</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Dışa Aktar
                    </Button>
                    <Button size="sm">Kullanıcı Ekle</Button>
                  </div>
                </div>

                <div className="rounded-md border">
                  <div className="p-4">
                    <p className="font-medium">Kullanıcı Listesi</p>
                    <p className="text-sm text-muted-foreground">
                      Bu bölümde tüm kullanıcıların sayfalandırılmış bir listesi görüntülenecektir.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sellers" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Satıcı Başvuruları</h2>
                  <Link href="/admin/panel/satici-basvurulari">
                    <Button variant="outline" size="sm">
                      Tümünü Görüntüle
                    </Button>
                  </Link>
                </div>

                {stats.pendingApplications > 0 ? (
                  <div className="rounded-md border">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{stats.pendingApplications} Bekleyen Başvuru</p>
                          <p className="text-sm text-muted-foreground">
                            Onay bekleyen satıcı başvuruları bulunmaktadır.
                          </p>
                        </div>
                        <Link href="/admin/panel/satici-basvurulari">
                          <Button size="sm">İncele</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <div className="p-4">
                      <p className="font-medium">Bekleyen Başvuru Yok</p>
                      <p className="text-sm text-muted-foreground">
                        Şu anda bekleyen satıcı başvurusu bulunmamaktadır.
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="stores">
                <h2 className="text-xl font-semibold">Mağaza Yönetimi</h2>
                <p className="mt-2 text-muted-foreground">
                  Platformda {stats.storeCount} aktif mağaza bulunmaktadır. Bu bölümde mağaza yönetim araçları
                  görüntülenecektir.
                </p>
              </TabsContent>

              <TabsContent value="products">
                <h2 className="text-xl font-semibold">Ürün Yönetimi</h2>
                <p className="mt-2 text-muted-foreground">
                  Platformda {stats.productCount} ürün bulunmaktadır. Bu bölümde ürün yönetim araçları
                  görüntülenecektir.
                </p>
              </TabsContent>

              <TabsContent value="orders">
                <h2 className="text-xl font-semibold">Sipariş Yönetimi</h2>
                <p className="mt-2 text-muted-foreground">
                  Bu bölümde sipariş yönetim araçları ve raporlar görüntülenecektir.
                </p>
              </TabsContent>

              <TabsContent value="payouts">
                <div className="rounded-md border p-4 mt-4">
                  <h2 className="text-lg font-bold mb-4">Ödeme Talepleri</h2>
                  <table className="w-full border">
                    <thead>
                      <tr>
                        <th>Satıcı</th>
                        <th>Banka</th>
                        <th>IBAN</th>
                        <th>Tutar</th>
                        <th>Açıklama</th>
                        <th>Durum</th>
                        <th>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((p: any) => (
                        <tr key={p.id} className="border-t">
                          <td>{p.seller_name}</td>
                          <td>{p.bank_name}</td>
                          <td>{p.iban}</td>
                          <td>{p.amount} TL</td>
                          <td>{p.description}</td>
                          <td>{p.status}</td>
                          <td>
                            {p.status === "PENDING" && (
                              <button onClick={() => approvePayout(p.id)} className="px-2 py-1 bg-green-600 text-white rounded">Ödendi Olarak İşaretle</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>

            {/* Add the CleanProductsButton component to the dashboard */}
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-4">Bakım İşlemleri</h2>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-medium mb-2">Hatalı Ürünleri Temizle</h3>
                <p className="text-muted-foreground mb-4">
                  Bu işlem, veritabanındaki hatalı fiyat bilgisine sahip ürünleri temizler.
                </p>
                <CleanProductsButton />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
