"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  Store,
  ShoppingBag,
  DollarSign,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import AdminLayout from "@/components/admin/AdminLayout"
import { CleanProductsButton } from "./clean-products"

export default function AdminDashboardPage() {
  const [loadingData, setLoadingData] = useState(true)
  const [stats, setStats] = useState({
    userCount: 0,
    storeCount: 0,
    productCount: 0,
    revenue: 0,
    pendingApplications: 0,
  })

  const [payouts, setPayouts] = useState<any[]>([])
  const [loadingPayouts, setLoadingPayouts] = useState(true)
  const [payoutsError, setPayoutsError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
    fetchPayouts()
  }, [])

  const loadDashboardData = async () => {
    setLoadingData(true)
    try {
      const [userCountRes, storeCountRes, productCountRes, pendingApplicationsRes, revenueRes] = await Promise.allSettled([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('stores').select('id', { count: 'exact', head: true }).eq('approved', true),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('approved', true),
        supabase.from('seller_applications').select('id', { count: 'exact', head: true }).eq('status', 'PENDING_APPROVAL'),
        supabase.from('orders').select('total_amount').eq('status', 'COMPLETED')
      ])

      const processSettledResult = (result: PromiseSettledResult<any>, itemName: string) => {
        if (result.status === 'rejected') {
          console.error(`Failed to fetch ${itemName} (rejected promise):`, result.reason)
          const err = new Error(`Sunucu hatası: ${itemName} alınamadı.`)
            (err as any).details = JSON.stringify(result.reason)
          throw err
        }
        if (result.value.error) {
          console.error(`Error fetching ${itemName} (Supabase error object):`, result.value.error)
          console.error(`Full Supabase response for ${itemName} (result.value):`, result.value)
          const sbError = result.value.error
          const detailedMessage = `${itemName} verileri alınırken bir hata oluştu. Supabase Hatası: ${sbError.message || 'Mesaj yok'}${sbError.details ? ` Detay: ${sbError.details}` : ''}${sbError.hint ? ` İpucu: ${sbError.hint}` : ''}${sbError.code ? ` Kod: ${sbError.code}` : ''}${Object.keys(sbError).length === 0 ? ' (Boş hata nesnesi)' : ''}`
          const err = new Error(detailedMessage)
            (err as any).originalError = sbError
              (err as any).details = typeof sbError === 'object' && sbError !== null && Object.keys(sbError).length > 0 ? JSON.stringify(sbError) : 'Detay yok ya da boş nesne'
                (err as any).code = (sbError as any)?.code
          throw err
        }
        return result.value
      }

      const userCountData = processSettledResult(userCountRes, 'kullanıcı sayısı')
      const storeCountData = processSettledResult(storeCountRes, 'mağaza sayısı')
      const productCountData = processSettledResult(productCountRes, 'ürün sayısı')
      const pendingApplicationsData = processSettledResult(pendingApplicationsRes, 'bekleyen başvurular')
      const revenueDataResult = processSettledResult(revenueRes, 'gelir verisi')

      setStats({
        userCount: userCountData.count || 0,
        storeCount: storeCountData.count || 0,
        productCount: productCountData.count || 0,
        pendingApplications: pendingApplicationsData.count || 0,
        revenue: revenueDataResult.data?.reduce((acc: number, order: { total_amount: number | null }) => acc + (order.total_amount || 0), 0) || 0,
      })

    } catch (error: any) {
      console.error("Dashboard statistics yüklenirken genel hata (loadDashboardData catch):", error)
    } finally {
      setLoadingData(false)
    }
  }

  const fetchPayouts = async () => {
    setLoadingPayouts(true)
    setPayoutsError(null)
    try {
      const res = await fetch("/api/admin/payouts")
      if (!res.ok) {
        let errorMsg = `Ödeme talepleri alınamadı. Sunucu ${res.status} kodu ile yanıt verdi.`
        try {
          const errorData = await res.json()
          errorMsg = errorData.error || errorData.message || errorMsg
        } catch (e) { /* Ignore if response is not json */ }
        throw new Error(errorMsg)
      }
      const data = await res.json()
      if (data.error) {
        throw new Error(data.error)
      }
      setPayouts(data.payouts || [])
    } catch (err: any) {
      console.error("Error fetching payouts:", err)
      setPayoutsError(err.message || "Ödeme talepleri yüklenirken bilinmeyen bir hata oluştu.")
    } finally {
      setLoadingPayouts(false)
    }
  }

  const approvePayout = async (payoutId: string) => {
    try {
      const res = await fetch(`/api/admin/payouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: payoutId,
          status: 'COMPLETED',
          description: 'Admin tarafından ödendi olarak işaretlendi.'
        }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Bilinmeyen sunucu hatası" }))
        throw new Error(errorData.error || errorData.message || `Ödeme onaylanamadı (HTTP ${res.status})`)
      }
      alert("Ödeme başarıyla 'Ödendi' olarak işaretlendi.")
      fetchPayouts()
    } catch (err: any) {
      console.error("Error approving payout:", err)
      alert(`Ödeme onaylanırken hata: ${err.message}`)
    }
  }

  if (loadingData) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <Loader2 className="h-12 w-12 text-orange-500 animate-spin mb-4" />
          <h2 className="text-xl font-bold">Dashboard Verileri Yükleniyor...</h2>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Ödeme Talepleri</h2>
                <Button variant="outline" size="sm" onClick={fetchPayouts} disabled={loadingPayouts}>
                  {loadingPayouts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Yenile
                </Button>
              </div>

              {loadingPayouts && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-8 w-8 text-orange-500 animate-spin mr-2" />
                  <span>Ödeme talepleri yükleniyor...</span>
                </div>
              )}
              {payoutsError && (
                <div className="text-red-500 bg-red-50 p-3 rounded-md">
                  <p className="font-semibold">Hata:</p>
                  <p>{payoutsError}</p>
                </div>
              )}
              {!loadingPayouts && !payoutsError && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-left font-semibold">Satıcı</th>
                        <th className="p-2 text-left font-semibold">Banka</th>
                        <th className="p-2 text-left font-semibold">IBAN</th>
                        <th className="p-2 text-left font-semibold">Tutar</th>
                        <th className="p-2 text-left font-semibold">Açıklama</th>
                        <th className="p-2 text-left font-semibold">Durum</th>
                        <th className="p-2 text-left font-semibold">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-gray-500">Gösterilecek ödeme talebi bulunmuyor.</td>
                        </tr>
                      ) : payouts.map((p: any) => (
                        <tr key={p.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{p.seller_name || 'N/A'}</td>
                          <td className="p-2">{p.store_name || 'N/A'}</td>
                          <td className="p-2">{p.iban || 'N/A'}</td>
                          <td className="p-2">{p.amount ? `${p.amount.toLocaleString()} TL` : 'N/A'}</td>
                          <td className="p-2">{p.description || '-'}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${p.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                              {p.status || 'N/A'}
                            </span>
                          </td>
                          <td className="p-2">
                            {p.status === "PENDING" && (
                              <Button
                                onClick={() => approvePayout(p.id)}
                                size="sm"
                                variant="outline"
                                className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                              >
                                Ödendi İşaretle
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

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
    </AdminLayout>
  )
}
