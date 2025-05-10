"use client"

import { useEffect, useState, useContext } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { CartContext } from "@/providers/cart-provider"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ShoppingCart, Store } from "lucide-react"
import PaymentForm from "@/components/payment/payment-form"
import { getSignedImageUrlForAny } from "@/lib/get-signed-url"

export default function PaymentPage() {
  const router = useRouter()
  const { cartItems, cartTotal } = useContext(CartContext)
  const auth = (useAuth() as any) || {}
  const user = auth.user
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [address, setAddress] = useState("")
  const [addressId, setAddressId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [orderSummaryItems, setOrderSummaryItems] = useState<any[]>([])
  const [storeShippingFees, setStoreShippingFees] = useState<Record<string, number>>({})
  const [storeFreeShippingThresholds, setStoreFreeShippingThresholds] = useState<Record<string, number>>({})
  const [shippingTotal, setShippingTotal] = useState(0)

  const itemsByStore = cartItems?.reduce((acc, item) => {
    if (!acc[item.storeId]) {
      acc[item.storeId] = {
        storeName: item.storeName,
        storeId: item.storeId,
        storeSlug: item.storeSlug,
        items: [],
      }
    }
    acc[item.storeId].items.push(item)
    return acc
  }, {} as Record<string, { storeName: string; storeId: string; storeSlug: string; items: typeof cartItems }>) || {}

  useEffect(() => {
    async function fetchPageData() {
      if (!user) {
        router.push("/giris?redirect=/odeme")
        return
      }

      if (cartItems.length === 0) {
        setError("Sepetinizde ürün bulunmuyor.")
        setLoading(false)
        return
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        if (profile) {
          setName(profile.full_name || "")
          setPhone(profile.phone || "")
        }

        const { data: addressData, error: addressError } = await supabase
          .from("user_addresses")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_default", true)
          .single()

        if (addressError && addressError.code !== 'PGRST116') {
          throw addressError;
        }

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

        const processedItems = await Promise.all(
          cartItems.map(async (item) => {
            let imageUrl = "/placeholder.png"
            if (item.image) {
              const signedUrl = await getSignedImageUrlForAny(item.image)
              if (signedUrl) imageUrl = signedUrl
            }
            return { ...item, displayImageUrl: imageUrl }
          })
        )
        setOrderSummaryItems(processedItems)

      } catch (err: any) {
        console.error("Ödeme sayfası verileri alınırken hata:", err)
        setError("Ödeme bilgileri yüklenirken bir sorun oluştu.")
        toast({
          title: "Hata",
          description: err.message || "Ödeme bilgileri yüklenemedi.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPageData()
  }, [user, router, supabase, cartItems, toast])

  useEffect(() => {
    const fetchShippingFees = async () => {
      const storeIds = Object.keys(itemsByStore);
      if (storeIds.length === 0) {
        setStoreShippingFees({});
        setStoreFreeShippingThresholds({});
        setShippingTotal(0);
        return;
      }
      const { data, error } = await supabase
        .from("stores")
        .select("id, shipping_fee, free_shipping_threshold")
        .in("id", storeIds);
      if (!error && data) {
        const fees: Record<string, number> = {};
        const thresholds: Record<string, number> = {};
        let total = 0;
        data.forEach((store: any) => {
          const fee = Number(store.shipping_fee) || 0;
          const threshold = Number(store.free_shipping_threshold) || 0;
          fees[store.id] = fee;
          thresholds[store.id] = threshold;
          total += fee;
        });
        setStoreShippingFees(fees);
        setStoreFreeShippingThresholds(thresholds);
        setShippingTotal(total);
      } else {
        setStoreShippingFees({});
        setStoreFreeShippingThresholds({});
        setShippingTotal(0);
      }
    };
    fetchShippingFees();
  }, [cartItems]);

  const storeTotals: Record<string, number> = {};
  Object.values(itemsByStore).forEach(store => {
    storeTotals[store.storeId] = store.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  });

  const isStoreFreeShipping = (storeId: string) => {
    const threshold = storeFreeShippingThresholds[storeId] || 0;
    return storeTotals[storeId] >= threshold && threshold > 0;
  };

  const storeShippingFeeToShow = (storeId: string) => {
    if (isStoreFreeShipping(storeId)) return 0;
    return storeShippingFees[storeId] || 0;
  };

  const totalShipping = Object.keys(itemsByStore).reduce((sum, storeId) => sum + storeShippingFeeToShow(storeId), 0);

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

  if (cartItems.length === 0) {
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

  const orderDetails = {
    total_amount: cartTotal + totalShipping,
    subtotal_amount: cartTotal,
    shipping_fee: totalShipping,
    items: orderSummaryItems,
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
        <Card>
          <CardHeader>
            <CardTitle>Sipariş Özeti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orderDetails.items.map((item: any) => (
                <div key={item.id || item.productId} className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-md overflow-hidden bg-muted">
                    <img
                      src={item.displayImageUrl || "/placeholder.png"}
                      alt={item.name || "Görsel"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} adet x {item.price.toFixed(2)} TL
                    </p>
                  </div>
                  <div className="font-medium">{(item.quantity * item.price).toFixed(2)} TL</div>
                </div>
              )
              )}

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Ara Toplam</span>
                  <span>{orderDetails.subtotal_amount.toFixed(2)} TL</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Kargo</span>
                  {Object.entries(storeShippingFees).map(([storeId, fee]) => (
                    <div key={storeId} className="flex justify-between text-xs ml-2">
                      <span>Mağaza {itemsByStore[storeId]?.storeName || storeId}</span>
                      <span>{isStoreFreeShipping(storeId) ? "Ücretsiz" : (fee > 0 ? fee.toLocaleString("tr-TR") + " ₺" : "Ücretsiz")}</span>
                    </div>
                  ))}
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Toplam</span>
                  <span>{orderDetails.total_amount.toFixed(2)} TL</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Teslimat Adresi</CardTitle>
            <Button variant="outline" size="sm" onClick={() => router.push("/hesabim/adreslerim?redirect=/odeme")}>Değiştir</Button>
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
                <Button variant="outline" size="sm" className="mt-2" onClick={() => router.push("/hesabim/adreslerim?redirect=/odeme")}>Adres Ekle</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <PaymentForm
          totalAmount={orderDetails.total_amount}
          customerDetails={{
            userId: user?.id,
            email: user?.email,
            name: name,
            phone: phone,
            address: address,
            addressId: addressId,
          }}
          cartItems={cartItems}
        />
      </div>
    </div>
  )
}
