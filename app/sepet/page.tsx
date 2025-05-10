"use client"

import { useState, useContext, useEffect } from "react"
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
import { getSignedImageUrlForAny } from '@/lib/get-signed-url'
import { Input } from "@/components/ui/input"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [discount, setDiscount] = useState(0);
  const supabase = createClientComponentClient();
  const [storeShippingFees, setStoreShippingFees] = useState<Record<string, number>>({});
  const [storeFreeShippingThresholds, setStoreFreeShippingThresholds] = useState<Record<string, number>>({});
  const [shippingTotal, setShippingTotal] = useState(0);
  const [latestPrices, setLatestPrices] = useState<Record<string, { price: number, discount_price?: number, updated?: boolean }>>({});
  const [userCoupons, setUserCoupons] = useState<any[]>([]);
  const [userCouponsLoading, setUserCouponsLoading] = useState(false);

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

  // Her mağazanın shipping_fee ve free_shipping_threshold'unu çek
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

  // Sepetteki ürünlerin fiyatını canlı güncelle
  useEffect(() => {
    async function fetchLatestPrices() {
      if (!cartItems || cartItems.length === 0) return;
      const productIds = cartItems.map(item => item.productId);
      const variantIds = cartItems.map(item => item.variantId).filter(Boolean);
      // Ürün fiyatlarını çek
      const { data: products } = await supabase
        .from("products")
        .select("id, price, discount_price")
        .in("id", productIds);
      // Varyant fiyatlarını çek
      let variants: any[] = [];
      if (variantIds.length > 0) {
        const { data: vdata } = await supabase
          .from("product_variants")
          .select("id, price, discount_price")
          .in("id", variantIds);
        variants = vdata || [];
      }
      // Fiyatları eşleştir
      const priceMap: Record<string, { price: number, discount_price?: number, updated?: boolean }> = {};
      cartItems.forEach(item => {
        let found: any = null;
        if (item.variantId) {
          found = variants.find(v => v.id === item.variantId);
        } else {
          found = products?.find(p => p.id === item.productId);
        }
        if (found) {
          const newPrice = found.discount_price ?? found.price;
          priceMap[item.id] = {
            price: newPrice,
            discount_price: found.discount_price,
            updated: newPrice !== item.price
          };
        }
      });
      setLatestPrices(priceMap);
    }
    fetchLatestPrices();
  }, [cartItems]);

  // Her mağaza için sepet toplamını hesapla
  const storeTotals: Record<string, number> = {};
  Object.values(itemsByStore).forEach(store => {
    storeTotals[store.storeId] = store.items.reduce((sum, item) => {
      const price = latestPrices[item.id]?.price ?? item.price;
      return sum + price * item.quantity;
    }, 0);
  });

  // Her mağaza için kargo ücretsiz mi?
  const isStoreFreeShipping = (storeId: string) => {
    const threshold = storeFreeShippingThresholds[storeId] || 0;
    return storeTotals[storeId] >= threshold && threshold > 0;
  };
  const storeShippingFeeToShow = (storeId: string) => {
    if (isStoreFreeShipping(storeId)) return 0;
    return storeShippingFees[storeId] || 0;
  };
  const storeFreeShippingMessage = (storeId: string) => {
    const threshold = storeFreeShippingThresholds[storeId] || 0;
    const total = storeTotals[storeId] || 0;
    if (threshold > 0 && total < threshold) {
      const kalan = threshold - total;
      return `Bu mağazadan ${threshold.toLocaleString("tr-TR")} ₺ ve üzeri alışverişte kargo ücretsiz! ${kalan.toLocaleString("tr-TR")} ₺ daha alışveriş yaparsanız kargo ücretsiz.`;
    }
    if (threshold > 0 && total >= threshold) {
      return "Bu mağazada kargo ücretsiz!";
    }
    return null;
  };

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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponMessage("Lütfen bir kupon kodu girin.");
      setDiscount(0);
      return;
    }
    // Kuponu Supabase'den çek
    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", couponCode.toUpperCase())
      .eq("is_active", true)
      .maybeSingle();
    if (error || !coupon) {
      setDiscount(0);
      setCouponMessage("Geçersiz veya süresi dolmuş kupon kodu.");
      return;
    }
    // Minimum tutar kontrolü
    if (coupon.min_purchase_amount && cartTotal < coupon.min_purchase_amount) {
      setDiscount(0);
      setCouponMessage(`Bu kuponu kullanmak için minimum sepet tutarı: ${coupon.min_purchase_amount.toLocaleString("tr-TR")} ₺`);
      return;
    }
    // Kategoriye özel kupon kontrolü
    let eligibleTotal = 0;
    if (coupon.applicable_to === "specific_categories" && Array.isArray(coupon.applicable_category_ids) && coupon.applicable_category_ids.length > 0) {
      // Sepetteki uygun ürünlerin toplamını bul
      eligibleTotal = cartItems.reduce((sum, item) => {
        if (item.categoryId && coupon.applicable_category_ids.includes(item.categoryId)) {
          const price = latestPrices[item.id]?.price ?? item.price;
          return sum + price * item.quantity;
        }
        return sum;
      }, 0);
      if (eligibleTotal === 0) {
        setDiscount(0);
        setCouponMessage("Bu kupon, sepetinizdeki ürünlerin kategorileriyle eşleşmiyor.");
        return;
      }
    } else if (coupon.applicable_to === "specific_products" && Array.isArray(coupon.applicable_product_ids) && coupon.applicable_product_ids.length > 0) {
      // Ürün bazlı kupon
      eligibleTotal = cartItems.reduce((sum, item) => {
        if (coupon.applicable_product_ids.includes(item.productId)) {
          const price = latestPrices[item.id]?.price ?? item.price;
          return sum + price * item.quantity;
        }
        return sum;
      }, 0);
      if (eligibleTotal === 0) {
        setDiscount(0);
        setCouponMessage("Bu kupon, sepetinizdeki ürünlerle eşleşmiyor.");
        return;
      }
    } else {
      // Tüm ürünler için geçerli
      eligibleTotal = cartTotal;
    }
    // İndirim hesapla
    let calculatedDiscount = 0;
    if (coupon.discount_type === "percentage") {
      calculatedDiscount = Math.floor(eligibleTotal * (coupon.discount_value / 100));
    } else {
      calculatedDiscount = Math.min(eligibleTotal, coupon.discount_value);
    }
    setDiscount(calculatedDiscount);
    setCouponMessage(`Kupon başarıyla uygulandı! ${calculatedDiscount.toLocaleString("tr-TR")} ₺ indirim kazandınız.`);
  };

  useEffect(() => {
    if (!user) return;
    setUserCouponsLoading(true);
    supabase
      .from("user_coupons")
      .select("id, coupons:coupon_id(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setUserCoupons(data || []);
        setUserCouponsLoading(false);
      });
  }, [user]);

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
                  {storeShippingFeeToShow(store.storeId) > 0 && (
                    <span className="ml-2 text-xs text-blue-600">Kargo: {storeShippingFeeToShow(store.storeId).toLocaleString("tr-TR")} ₺</span>
                  )}
                  {isStoreFreeShipping(store.storeId) && (
                    <span className="ml-2 text-xs text-green-600 font-semibold">Kargo Ücretsiz</span>
                  )}
                </Link>
                {storeFreeShippingMessage(store.storeId) && (
                  <div className="text-xs mt-1 text-blue-700 font-medium">{storeFreeShippingMessage(store.storeId)}</div>
                )}
              </CardHeader>
              <CardContent>
                {store.items.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row gap-4 py-4 border-b last:border-0">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <div className="relative h-20 w-20 rounded-md overflow-hidden">
                        <Link href={item.slug ? `/urun/${item.slug}` : `/urun/id/${item.productId}`}>
                          <ImageWithSignedUrl imageUrl={item.image} alt={item.name} />
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
                          <span className="font-medium">{item.variantName}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="font-bold text-orange-500">
                          {latestPrices[item.id]?.price?.toLocaleString("tr-TR")} ₺
                          {latestPrices[item.id]?.updated && (
                            <span className="ml-2 text-xs text-red-500 font-semibold">Fiyat güncellendi</span>
                          )}
                        </div>
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
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Kargo</span>
                {Object.entries(storeShippingFees).map(([storeId, fee]) => (
                  <div key={storeId} className="flex justify-between text-xs ml-2">
                    <span>Mağaza {itemsByStore[storeId]?.storeName || storeId}</span>
                    <span>{isStoreFreeShipping(storeId) ? "Ücretsiz" : (fee > 0 ? fee.toLocaleString("tr-TR") + " ₺" : "Ücretsiz")}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Hesabınızdaki Kuponlar</label>
                <Select
                  disabled={userCouponsLoading || userCoupons.length === 0}
                  onValueChange={val => setCouponCode(val)}
                  value={couponCode}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={userCouponsLoading ? "Yükleniyor..." : (userCoupons.length === 0 ? "Hesabınızda kupon yok" : "Kupon seçin")} />
                  </SelectTrigger>
                  <SelectContent>
                    {userCoupons.map((uc) => (
                      <SelectItem key={uc.id} value={uc.coupons?.code || ""}>
                        {uc.coupons?.code} {uc.coupons?.description ? `- ${uc.coupons.description}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-2">
                <label className="block text-sm font-medium mb-1">İndirim Kuponu</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Kupon Kodunuz"
                    value={couponCode}
                    onChange={e => {
                      setCouponCode(e.target.value.toUpperCase());
                      if (couponMessage) setCouponMessage("");
                    }}
                    className="flex-grow"
                  />
                  <Button onClick={handleApplyCoupon} variant="outline">Uygula</Button>
                </div>
                {couponMessage && (
                  <p className={`mt-2 text-xs ${discount > 0 ? "text-green-600" : "text-red-600"}`}>{couponMessage}</p>
                )}
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-700 font-semibold">
                  <span>İndirim</span>
                  <span>-{discount.toLocaleString("tr-TR")} ₺</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Toplam</span>
                <span className="text-orange-500">{(cartTotal + shippingTotal - discount).toLocaleString("tr-TR")} ₺</span>
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

// Helper component to handle signed URL generation for images
const ImageWithSignedUrl = ({ imageUrl, alt }: { imageUrl: string | null | undefined, alt: string }) => {
  const [signedUrl, setSignedUrl] = useState<string>("/placeholder.svg");

  useEffect(() => {
    if (imageUrl) {
      getSignedImageUrlForAny(imageUrl).then(url => {
        if (url) {
          setSignedUrl(url);
        }
      }).catch(console.error);
    }
  }, [imageUrl]);

  return <Image src={signedUrl} alt={alt} fill className="object-cover" />;
};
