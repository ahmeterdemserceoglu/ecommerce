"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

export default function FailedPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (!orderId) {
      setError("Sipariş ID'si bulunamadı")
      setLoading(false)
      return
    }

    async function fetchOrderDetails() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/giris")
          return
        }

        const { data, error } = await supabase
          .from("orders")
          .select(`
            *,
            order_items (
              *,
              product:products (name, image_url)
            ),
            store:stores (name, slug)
          `)
          .eq("id", orderId)
          .eq("user_id", user.id)
          .single()

        if (error) {
          console.error("Error fetching order:", error)
          setError("Sipariş bilgileri alınamadı")
          setLoading(false)
          return
        }

        setOrder(data)
        setLoading(false)
      } catch (err) {
        console.error("Error:", err)
        setError("Bir hata oluştu")
        setLoading(false)
      }
    }

    fetchOrderDetails()
  }, [orderId, router, supabase])

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-10 px-4">
        <Card>
          <CardHeader className="text-center">
            <Skeleton className="h-8 w-3/4 mx-auto mb-2" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mb-6">
              <Skeleton className="h-20 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-6" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto py-10 px-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Hata</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push("/")}>Ana Sayfaya Dön</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container max-w-4xl mx-auto py-10 px-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Sipariş Bulunamadı</CardTitle>
            <CardDescription>Aradığınız sipariş bulunamadı veya erişim izniniz yok.</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push("/")}>Ana Sayfaya Dön</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl">Ödeme Başarısız</CardTitle>
          <CardDescription>Ödeme işleminiz sırasında bir sorun oluştu ve ödemeniz tamamlanamadı.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h3 className="font-medium text-red-800 mb-2">Olası Nedenler:</h3>
              <ul className="list-disc pl-5 text-sm text-red-700 space-y-1">
                <li>Kart bilgileriniz hatalı olabilir</li>
                <li>Kartınızda yeterli bakiye bulunmayabilir</li>
                <li>Kartınız internet alışverişine kapalı olabilir</li>
                <li>Bankanız işlemi onaylamamış olabilir</li>
                <li>Ödeme sırasında teknik bir sorun oluşmuş olabilir</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-medium mb-2">Ne Yapabilirsiniz?</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Kart bilgilerinizi kontrol edip tekrar deneyebilirsiniz</li>
                <li>Farklı bir ödeme yöntemi kullanabilirsiniz</li>
                <li>Bankanızla iletişime geçebilirsiniz</li>
                <li>Daha sonra tekrar deneyebilirsiniz</li>
              </ul>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">Sipariş Bilgileri</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Sipariş Numarası:</span>
                </div>
                <div>{order.id}</div>
                <div>
                  <span className="text-muted-foreground">Toplam Tutar:</span>
                </div>
                <div>{order.total_amount} TL</div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4 justify-between">
          <Button onClick={() => router.push("/sepet")} variant="outline" className="w-full sm:w-auto">
            Sepete Dön
          </Button>
          <Button onClick={() => router.push(`/odeme?orderId=${orderId}`)} className="w-full sm:w-auto">
            Tekrar Dene
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
