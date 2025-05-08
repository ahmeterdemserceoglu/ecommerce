"use client"

import { useState, useContext } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { CartContext } from "@/providers/cart-provider"
import { useAuth } from "@/hooks/use-auth"
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, Store, AlertCircle, RefreshCw } from "lucide-react"

export default function CartPage() {
  const router = useRouter()
  const { toast } = useToast()
  const auth = useAuth() || { user: null }
  const user = (auth as any).user
  const {
    cartItems = [],
    cartTotal = 0,
    updateQuantity,
    removeFromCart,
    clearCart,
    loading,
    reloadCart,
  } = useContext(CartContext)
  console.log("Sepet sayfası yükleniyor, sepet öğeleri:", cartItems?.length || 0)
  const [processingCheckout, setProcessingCheckout] = useState(false)

  // Group items by store
  const itemsByStore =
    cartItems?.reduce(
      (acc, item) => {
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
      },
      {} as Record<string, { storeName: string; storeId: string; storeSlug: string; items: typeof cartItems }>,
    ) || {}

  const handleQuantityChange = (itemId: string, currentQuantity: number, change: number) => {
    const newQuantity = currentQuantity + change
    if (newQuantity < 1) return
    updateQuantity(itemId, newQuantity)
  }

  const handleCheckout = () => {
    if (!user) {
      router.push("/giris?returnTo=/sepet")
      return
    }

    setProcessingCheckout(true)
    // Normally, this would navigate to a checkout page
    // For now, we'll just show a toast
    setTimeout(() => {
      toast({
        title: "Ödeme işlemi başlatılıyor",
        description: "Ödeme sayfasına yönlendiriliyorsunuz.",
      })
      setProcessingCheckout(false)
      router.push("/odeme")
    }, 1000)
  }

  if (loading) {
    console.log("Sepet yükleniyor...")
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-6">Sepetim</h1>
        <div className="flex justify-center py-10">
          <p>Sepetiniz yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!cartItems || cartItems.length === 0) {
    console.log("Sepet boş veya tanımsız:", cartItems)
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-6">Sepetim</h1>
        <Card className="text-center py-10">
          <CardContent>
            <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-medium mb-2">Sepetiniz boş</h2>
            <p className="text-muted-foreground mb-6">Sepetinizde henüz ürün bulunmuyor.</p>
            <Link href="/">
              <Button className="bg-orange-500 hover:bg-orange-600">Alışverişe Başla</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  console.log("Sepet sayfası render ediliyor, sepet öğeleri:", cartItems.length)

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sepetim ({cartItems.length} Ürün)</h1>
        <Button variant="outline" onClick={() => reloadCart()} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Sepeti Yenile
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {Object.values(itemsByStore).map((store) => (
            <Card key={store.storeId}>
              <CardHeader className="pb-2">
                <Link
                  href={store.storeSlug ? `/magaza/${store.storeSlug}` : `/magaza/id/${store.storeId}`}
                  className={`flex items-center gap-2 ${store.storeSlug ? "hover:text-orange-500" : "text-gray-400 cursor-not-allowed"}`}
                  onClick={(e) => {
                    if (!store.storeSlug) e.preventDefault()
                    if (!store.storeSlug && process.env.NODE_ENV === "development")
                      console.warn("Sepet mağaza slug eksik:", store)
                  }}
                  title={store.storeSlug ? "" : "Mağaza bilgisi eksik"}
                >
                  <Store className="h-4 w-4" />
                  <span className="font-bold text-base">{store.storeName}</span>
                </Link>
              </CardHeader>
              <CardContent>
                {store.items.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row gap-4 py-4 border-b last:border-0">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <div className="relative h-20 w-20 rounded-md overflow-hidden">
                        <Link href={item.slug ? `/urun/${item.slug}` : `/urun/id/${item.productId}`}>
                          <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                        </Link>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Sadece ürün adı: büyük, turuncu, ürün detayına yönlendiren link */}
                      <Link
                        href={item.slug ? `/urun/${item.slug}` : `/urun/id/${item.productId}`}
                        className="text-lg font-bold text-orange-600 hover:text-orange-700 leading-tight mb-1 block"
                        style={{ marginBottom: 4 }}
                      >
                        {item.name}
                      </Link>
                      {/* Variant and options */}
                      {item.variantName && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Seçenek: <span className="font-medium">{item.variantName}</span>
                        </div>
                      )}
                      {item.options && Object.keys(item.options).length > 0 && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {Object.entries(item.options).map(([key, value]) => (
                            <span key={key} className="mr-2">
                              {key}: <span className="font-medium">{value}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="font-bold text-orange-500">{item.price.toLocaleString("tr-TR")} ₺</div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleQuantityChange(item.id, item.quantity, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleQuantityChange(item.id, item.quantity, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => clearCart()}>
              Sepeti Temizle
            </Button>
            <Link href="/">
              <Button variant="link" className="text-orange-500">
                Alışverişe Devam Et
              </Button>
            </Link>
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Sipariş Özeti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ara Toplam</span>
                <span>{cartTotal.toLocaleString("tr-TR")} ₺</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kargo</span>
                <span>Ücretsiz</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Toplam</span>
                <span className="text-orange-500">{cartTotal.toLocaleString("tr-TR")} ₺</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600"
                size="lg"
                onClick={handleCheckout}
                disabled={processingCheckout}
              >
                {processingCheckout ? "İşleniyor..." : "Ödemeye Geç"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Güvenli Alışveriş</p>
                <p>Tüm ödemeleriniz 256-bit SSL sertifikası ile şifrelenerek koruma altına alınmaktadır.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
