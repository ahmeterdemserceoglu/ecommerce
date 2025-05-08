"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

export default function SuccessfulPaymentPage() {
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

            <Separator className="my-6" />

            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
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

  const formattedDate = new Date(order.created_at).toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Ödeme Başarılı</CardTitle>
          <CardDescription>Siparişiniz başarıyla oluşturuldu ve ödemeniz alındı.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Sipariş Numarası</h3>
                <p className="font-medium">{order.id}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Sipariş Tarihi</h3>
                <p className="font-medium">{formattedDate}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Toplam Tutar</h3>
                <p className="font-medium">{order.total_amount} TL</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-2">Teslimat Adresi</h3>
              <p className="text-sm">{order.shipping_address}</p>
            </div>

            <Separator />

            <div>
              <h3 className="font-medium mb-4">Sipariş Detayları</h3>
              <div className="space-y-4">
                {order.order_items.map((item: any) => (
                  <div key={item.id} className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-md overflow-hidden bg-muted">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url || "/placeholder.svg"}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                          <span className="text-xs text-gray-500">Görsel yok</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} adet x {item.price} TL
                      </p>
                    </div>
                    <div className="font-medium">{(item.quantity * item.price).toFixed(2)} TL</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span>Ara Toplam</span>
                <span>{order.subtotal_amount} TL</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Kargo</span>
                <span>{order.shipping_fee} TL</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between mb-2">
                  <span>İndirim</span>
                  <span>-{order.discount_amount} TL</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Toplam</span>
                <span>{order.total_amount} TL</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4 justify-between">
          <Button onClick={() => router.push("/hesabim/siparislerim")} variant="outline" className="w-full sm:w-auto">
            Siparişlerim
          </Button>
          <Button onClick={() => router.push("/")} className="w-full sm:w-auto">
            Alışverişe Devam Et
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
