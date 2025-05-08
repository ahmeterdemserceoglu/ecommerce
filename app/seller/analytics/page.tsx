"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import SellerSidebar from "@/components/seller/seller-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { BarChart3 } from "lucide-react"

export default function AnalyticsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<any>({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
  })
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/auth/login?returnTo=/seller/analytics")
      return
    }
    if (user.role !== "seller") {
      router.push("/hesabim")
      return
    }
    fetchAnalytics()
  }, [user, authLoading])

  // fetchAnalytics fonksiyonunu useEffect dışına taşı
  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", user?.id)
        .single()
      if (storeError) throw storeError
      const storeId = storeData?.id

      // Toplam satış
      const { data: salesData } = await supabase.from("orders").select("total_amount").eq("store_id", storeId)
      const totalSales = salesData ? salesData.reduce((sum, o) => sum + (o.total_amount || 0), 0) : 0

      // Toplam sipariş
      const { count: totalOrders } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)

      // Toplam ürün
      const { count: totalProducts } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)

      setAnalytics({
        totalSales,
        totalOrders: totalOrders || 0,
        totalProducts: totalProducts || 0,
        totalCustomers: 0, // Müşteri sayısı için ek sorgu gerekebilir
      })
    } catch (error) {
      toast({
        title: "Hata",
        description: "Analiz verileri yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Analitik sayfası yükleniyor...</p>
          <p className="text-sm text-gray-500">Lütfen bekleyin, verileriniz hazırlanıyor.</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== "seller") {
    return null
  }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <SellerSidebar />
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Analitik</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Toplam Satış</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalSales} ₺</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Toplam Sipariş</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalOrders}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Toplam Ürün</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalProducts}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Toplam Müşteri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalCustomers}</div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Satış Grafiği</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mr-2" />
                  <span>Grafik entegrasyonu için Chart.js veya benzeri eklenebilir.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
