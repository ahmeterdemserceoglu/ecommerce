"use client"

import { useEffect, useState, useContext } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { CartContext } from "@/providers/cart-provider"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ShoppingCart } from "lucide-react"
import PaymentForm from "@/components/payment/payment-form"

export default function PaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const { cartItems, cartTotal, clearCart } = useContext(CartContext)
  const auth = (useAuth() as any) || {}
  const user = auth.user
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [address, setAddress] = useState("")
  const [addressId, setAddressId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")

  useEffect(() => {
    async function fetchOrderDetails() {
      if (!user) {
        router.push("/giris?redirect=/odeme")
        return
      }

      if (orderId) {
        // Mevcut sipariş detaylarını getir
        try {
          const { data, error } = await supabase
            .from("orders")
            .select("*, order_items(*)")
            .eq("id", orderId)
            .eq("user_id", user.id)
            .single()

          if (error) throw error
          setOrder(data)
        } catch (err: any) {
          console.error("Sipariş detayları alınırken hata:", err)
          setError("Sipariş bulunamadı veya erişim izniniz yok.")
          toast({
            title: "Hata",
            description: "Sipariş detayları alınamadı.",
            variant: "destructive",
          })
        } finally {
          setLoading(false)
        }
      } else if (cartItems.length === 0) {
        // Sepet boşsa ödeme yapılamaz
        setError("Sepetinizde ürün bulunmuyor.")
        setLoading(false)
      } else {
        // Kullanıcı bilgilerini getir
        try {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("id", user.id)
            .single()

          if (profile) {
            setName(profile.full_name || "")
            setPhone(profile.phone || "")
          }

          // Varsayılan adresi getir
          const { data: addressData, error: addressError } = await supabase
            .from("user_addresses")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_default", true)
            .single()

          if (addressData) {
            setAddress(
              [
                addressData.full_name,
                addressData.address,
                addressData.district,
                addressData.city,
                addressData.postal_code,
                addressData.country,
                addressData.phone
              ].filter(Boolean).join(', ')
            )
            setAddressId(addressData.id)
          }

          setLoading(false)
        } catch (err) {
          console.error("Kullanıcı bilgileri alınırken hata:", err)
          setLoading(false)
        }
      }
    }

    fetchOrderDetails()
  }, [user, orderId, router, supabase, cartItems.length, toast])

  if (loading) {
    return (
      <div className="container py-10 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Ödeme</h1>
        <Card>
          <CardHeader>
            <CardTitle>Yükleniyor...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Sepet boşsa uyarı göster
  if (cartItems.length === 0 && !orderId) {
    return (
      <div className="container py-10 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Ödeme</h1>
        <Alert>
          <ShoppingCart className="h-4 w-4" />
          <AlertTitle>Sepetiniz boş</AlertTitle>
          <AlertDescription>Ödeme yapmak için sepetinize ürün ekleyin.</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push("/")}>Alışverişe Devam Et</Button>
        </div>
      </div>
    )
  }

  // Sipariş detayları
  const orderDetails = order || {
    id: null,
    total_amount: cartTotal + 15, // Kargo ücreti eklenmiş toplam
    subtotal_amount: cartTotal,
    shipping_fee: 15,
    discount_amount: 0,
    order_items: cartItems.map((item) => ({
      id: item.id,
      product_id: item.productId,
      quantity: item.quantity,
    })),
  }

  return (
    <div className="container py-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Ödeme</h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Hata</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Sipariş Özeti */}
        <Card>
          <CardHeader>
            <CardTitle>Sipariş Özeti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orderDetails.order_items.map((item: any) => {
                const cartItem = cartItems.find(ci => ci.productId === item.product_id)
                const price = item.price ?? cartItem?.price ?? 0
                return (
                  <div key={item.id} className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-md overflow-hidden bg-muted">
                      <img
                        src={item.product?.image_url || cartItem?.image_url || "/placeholder.png"}
                        alt={item.product?.name || cartItem?.name || "Görsel"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product?.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} adet x {price} TL
                      </p>
                    </div>
                    <div className="font-medium">{(item.quantity * price).toFixed(2)} TL</div>
                  </div>
                )
              })}

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Ara Toplam</span>
                  <span>{orderDetails.subtotal_amount.toFixed(2)} TL</span>
                </div>
                <div className="flex justify-between">
                  <span>Kargo</span>
                  <span>{orderDetails.shipping_fee.toFixed(2)} TL</span>
                </div>
                {orderDetails.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>İndirim</span>
                    <span>-{orderDetails.discount_amount.toFixed(2)} TL</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Toplam</span>
                  <span>{orderDetails.total_amount.toFixed(2)} TL</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teslimat Adresi */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Teslimat Adresi</CardTitle>
            <Button variant="outline" size="sm" onClick={() => router.push("/hesabim/adreslerim")}>Değiştir</Button>
          </CardHeader>
          <CardContent>
            {addressId && address ? (
              <div>
                <p className="font-medium">{name}</p>
                <div className="text-muted-foreground text-sm">
                  {address.split(",").map((part, idx) => (
                    <div key={idx}>{part.trim()}</div>
                  ))}
                </div>
                {phone && <p className="text-muted-foreground mt-1">{phone}</p>}
              </div>
            ) : (
              <div>
                <p className="text-muted-foreground">Teslimat adresi bulunamadı.</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => router.push("/hesabim/adreslerim")}>Adres Ekle</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ödeme Formu */}
        {orderDetails.id ? (
          <PaymentForm
            orderId={orderDetails.id}
            amount={orderDetails.total_amount}
            userId={user?.id}
            returnUrl={`${window.location.origin}/odeme/sonuc`}
            showAddCardButton={true}
          />
        ) : (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Hata</AlertTitle>
            <AlertDescription>Sipariş bulunamadı, ödeme yapılamaz.</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
