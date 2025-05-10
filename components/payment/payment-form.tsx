"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, CreditCard, Wallet } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { CartItem } from '@/providers/cart-provider'; // Assuming CartItem type is exported

interface CustomerDetails {
  userId?: string;
  email?: string;
  name?: string;
  phone?: string;
  address?: string;
  addressId?: string | null;
}

interface PaymentFormProps {
  totalAmount: number;
  customerDetails: CustomerDetails;
  cartItems: CartItem[];
  returnUrl?: string;
  showAddCardButton?: boolean;
}

interface SavedCard {
  id: string
  cardHolderName: string
  lastFourDigits: string
  expiryMonth: string
  expiryYear: string
  cardType: string
  isDefault: boolean
  bankId: string
}

interface Bank {
  id: string
  name: string
  logo: string
  supportedCardTypes: string[]
  installmentOptions: { count: number; commissionRate: number }[]
}

interface PaymentMethod {
  id: string
  type: string
  name: string
  logo: string
  isDefault: boolean
}

export default function PaymentForm({ totalAmount, customerDetails, cartItems, returnUrl, showAddCardButton }: PaymentFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const [paymentTab, setPaymentTab] = useState("credit-card")
  const [savedCards, setSavedCards] = useState<SavedCard[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedCard, setSelectedCard] = useState<string>("")
  const [selectedBank, setSelectedBank] = useState<string>("")
  const [installmentCount, setInstallmentCount] = useState<number>(1)
  const [saveCard, setSaveCard] = useState(false)
  const [use3DSecure, setUse3DSecure] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Kart bilgileri
  const [cardHolderName, setCardHolderName] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [expiryMonth, setExpiryMonth] = useState("")
  const [expiryYear, setExpiryYear] = useState("")
  const [cvv, setCvv] = useState("")

  useEffect(() => {
    async function fetchPaymentMethods() {
      try {
        const response = await fetch(`/api/payment/methods?userId=${customerDetails.userId}`)
        const data = await response.json()

        if (data.savedCards) setSavedCards(data.savedCards)
        if (data.banks) setBanks(data.banks)
        if (data.paymentMethods) setPaymentMethods(data.paymentMethods)

        // Varsayılan kart varsa seç
        const defaultCard = data.savedCards?.find((card: SavedCard) => card.isDefault)
        if (defaultCard) setSelectedCard(defaultCard.id)

        // İlk bankayı varsayılan olarak seç
        if (data.banks && data.banks.length > 0) setSelectedBank(data.banks[0].id)
      } catch (error) {
        console.error("Ödeme yöntemleri yüklenirken hata:", error)
        toast({
          title: "Hata",
          description: "Ödeme yöntemleri yüklenemedi.",
          variant: "destructive",
        })
      }
    }

    fetchPaymentMethods()
  }, [customerDetails.userId, toast])

  // Eğer selectedBank boşsa ve banks varsa otomatik olarak ilk bankayı seç
  useEffect(() => {
    if (!selectedBank && banks.length > 0) {
      setSelectedBank(banks[0].id)
    }
  }, [banks, selectedBank])

  // Kart seçildiğinde bankayı da otomatik seç
  useEffect(() => {
    if (selectedCard && savedCards.length > 0) {
      const card = savedCards.find((c) => c.id === selectedCard)
      if (card && card.bankId) {
        setSelectedBank(card.bankId)
      }
    }
  }, [selectedCard, savedCards])

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Sadece rakamları kabul et ve 16 karakterle sınırla
    const value = e.target.value.replace(/\D/g, "").slice(0, 16)
    setCardNumber(value)

    // Kart tipine göre banka seçimini otomatik yap
    if (value.length >= 6) {
      const cardType = detectCardType(value)
      const matchingBank = banks.find((bank) => Array.isArray(bank.supportedCardTypes) && bank.supportedCardTypes.includes(cardType))
      if (matchingBank) setSelectedBank(matchingBank.id)
    }
  }

  const detectCardType = (cardNumber: string): string => {
    // Basit bir kart tipi tespit algoritması
    if (cardNumber.startsWith("4")) {
      return "VISA"
    } else if (/^5[1-5]/.test(cardNumber)) {
      return "MASTERCARD"
    } else if (/^3[47]/.test(cardNumber)) {
      return "AMEX"
    } else if (/^9/.test(cardNumber)) {
      return "TROY"
    } else {
      return "UNKNOWN"
    }
  }

  const formatCardNumber = (value: string): string => {
    return value
      .replace(/\s/g, "")
      .replace(/(\d{4})/g, "$1 ")
      .trim()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Ön kontrol: Eksik alanları kullanıcıya bildir
    if (paymentTab === "credit-card") {
      if (selectedCard === "") {
        // Yeni kart ile ödeme
        const missingFields = []
        if (!cardNumber || cardNumber.replace(/\s/g, "").length < 16) missingFields.push("Kart Numarası")
        if (!cardHolderName) missingFields.push("Kart Üzerindeki İsim")
        if (!expiryMonth) missingFields.push("Son Kullanma Ayı")
        if (!expiryYear) missingFields.push("Son Kullanma Yılı")
        if (!cvv || cvv.length < 3) missingFields.push("CVV")
        if (!selectedBank) missingFields.push("Banka")
        if (!totalAmount) missingFields.push("Tutar")
        if (missingFields.length > 0) {
          setLoading(false)
          setError(`Eksik alanlar: ${missingFields.join(", ")}`)
          return
        }
      } else {
        // Kayıtlı kart ile ödeme
        const missingFields = []
        if (!selectedCard) missingFields.push("Kayıtlı Kart")
        if (!cvv || cvv.length < 3) missingFields.push("CVV")
        if (!selectedBank) missingFields.push("Banka")
        if (!totalAmount) missingFields.push("Tutar")
        if (missingFields.length > 0) {
          setLoading(false)
          setError(`Eksik alanlar: ${missingFields.join(", ")}`)
          return
        }
      }
    }

    try {
      // Ödeme yöntemi kontrolü
      if (paymentTab === "credit-card") {
        if (selectedCard === "" && !selectedBank) {
          throw new Error("Lütfen bir banka seçin")
        }

        // Kart bilgileri veya kayıtlı kart kontrolü
        if (!selectedCard && (!cardHolderName || !cardNumber || !expiryMonth || !expiryYear || !cvv)) {
          throw new Error("Lütfen kart bilgilerini eksiksiz doldurun")
        }

        // orderId olmadan da ödeme başlatılabilsin
        const paymentPayload = {
          userId: customerDetails.userId,
          amount: totalAmount,
          currency: "TRY",
          paymentMethod: "CREDIT_CARD",
          cartItems: cartItems.map(item => ({
            id: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            category1: item.storeName,
          })),
          customer: {
            id: customerDetails.userId,
            name: customerDetails.name,
            surname: '',
            email: customerDetails.email,
            identityNumber: '11111111111',
            registrationAddress: customerDetails.address,
            ip: '127.0.0.1',
            city: customerDetails.address?.split(',').find(part => part.toLowerCase().includes('ilçe'))?.trim() || '',
            country: customerDetails.address?.split(',').find(part => part.toLowerCase().includes('ülke'))?.trim() || 'Turkey',
          },
          billingAddress: {
            contactName: customerDetails.name,
            city: customerDetails.address?.split(',').find(part => part.toLowerCase().includes('ilçe'))?.trim() || '',
            country: customerDetails.address?.split(',').find(part => part.toLowerCase().includes('ülke'))?.trim() || 'Turkey',
            address: customerDetails.address,
            zipCode: customerDetails.address?.split(',').find(part => /\d{5}/.test(part))?.trim() || '',
          },
          shippingAddress: {
            contactName: customerDetails.name,
            city: customerDetails.address?.split(',').find(part => part.toLowerCase().includes('ilçe'))?.trim() || '',
            country: customerDetails.address?.split(',').find(part => part.toLowerCase().includes('ülke'))?.trim() || 'Turkey',
            address: customerDetails.address,
            zipCode: customerDetails.address?.split(',').find(part => /\d{5}/.test(part))?.trim() || '',
          },
          ...(selectedCard
            ? {
              savedCardId: selectedCard,
              cvv,
              bankId: selectedBank,
              installmentCount,
              use3DSecure,
              returnUrl: returnUrl || `${window.location.origin}/odeme/sonuc`,
            }
            : {
              cardNumber: cardNumber.replace(/\s/g, ""),
              cardHolderName,
              expiryMonth,
              expiryYear,
              cvv,
              bankId: selectedBank,
              installmentCount,
              use3DSecure,
              returnUrl: returnUrl || `${window.location.origin}/odeme/sonuc`,
            }),
        }

        const response = await fetch("/api/payment/initialize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(paymentPayload),
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || "Ödeme başlatılamadı")
        }

        // 3D Secure kullanılıyorsa yönlendirme yap
        if (use3DSecure && result.redirectUrl) {
          window.location.href = result.redirectUrl
          return
        }

        // 3D Secure kullanılmıyorsa başarılı sayfasına yönlendir
        router.push(`/odeme/basarili${result.orderId ? `?orderId=${result.orderId}` : ""}`)
      } else if (paymentTab === "wallet") {
        // Cüzdan ödemesi işlemleri
        toast({
          title: "Cüzdan Ödemesi",
          description: "Cüzdan ödemesi şu anda desteklenmiyor.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Ödeme hatası:", error)
      let errorMsg = error.message || "Ödeme işlemi sırasında bir hata oluştu"
      if (typeof errorMsg !== "string") {
        errorMsg = JSON.stringify(errorMsg)
      }
      setError(errorMsg)
      toast({
        title: "Ödeme Hatası",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getAvailableInstallments = () => {
    if (!selectedBank) return []
    const bank = banks.find((b) => b.id === selectedBank)
    return bank?.installmentOptions || []
  }

  const hasSavedCard = savedCards.length > 0 && selectedCard !== ""

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Ödeme Bilgileri</CardTitle>
          <CardDescription>Ödeme yöntemi seçin ve bilgilerinizi girin</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="credit-card" value={paymentTab} onValueChange={setPaymentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="credit-card" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Kredi Kartı
              </TabsTrigger>
              <TabsTrigger value="wallet" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Cüzdan
              </TabsTrigger>
            </TabsList>
            <TabsContent value="credit-card" className="space-y-4 pt-4">
              {savedCards.length > 0 && (
                <div className="space-y-4">
                  <div className="font-medium">Kayıtlı Kartlarım</div>
                  <RadioGroup value={selectedCard} onValueChange={setSelectedCard}>
                    {savedCards.map((card) => (
                      <div key={card.id} className="flex items-center space-x-2 border p-3 rounded-md">
                        <RadioGroupItem value={card.id} id={`card-${card.id}`} />
                        <Label htmlFor={`card-${card.id}`} className="flex-1">
                          <div className="flex justify-between">
                            <div>
                              <div className="font-medium">{card.cardHolderName}</div>
                              <div className="text-sm text-muted-foreground">**** **** **** {card.lastFourDigits}</div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {card.expiryMonth}/{card.expiryYear}
                            </div>
                          </div>
                        </Label>
                      </div>
                    ))}
                    <div className="flex items-center space-x-2 border p-3 rounded-md">
                      <RadioGroupItem value="" id="new-card" />
                      <Label htmlFor="new-card" className="flex-1">
                        Yeni kart ile öde
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {selectedCard !== "" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      maxLength={4}
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankId">Banka</Label>
                    <Select value={selectedBank} onValueChange={setSelectedBank} disabled={selectedCard !== ""}>
                      <SelectTrigger id="bankId">
                        <SelectValue placeholder="Banka seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {banks.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {(!savedCards.length || selectedCard === "") && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardHolderName">Kart Üzerindeki İsim</Label>
                    <Input
                      id="cardHolderName"
                      placeholder="Kart sahibinin adı"
                      value={cardHolderName}
                      onChange={(e) => setCardHolderName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Kart Numarası</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={formatCardNumber(cardNumber)}
                      onChange={handleCardNumberChange}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiryMonth">Ay</Label>
                      <Select value={expiryMonth} onValueChange={setExpiryMonth}>
                        <SelectTrigger id="expiryMonth">
                          <SelectValue placeholder="Ay" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => {
                            const month = (i + 1).toString().padStart(2, "0")
                            return (
                              <SelectItem key={month} value={month}>
                                {month}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiryYear">Yıl</Label>
                      <Select value={expiryYear} onValueChange={setExpiryYear}>
                        <SelectTrigger id="expiryYear">
                          <SelectValue placeholder="Yıl" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => {
                            const year = (new Date().getFullYear() + i).toString().slice(-2)
                            return (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        maxLength={4}
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="saveCard" checked={saveCard} onCheckedChange={(checked) => setSaveCard(!!checked)} />
                    <Label htmlFor="saveCard">Kartımı kaydet</Label>
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                {selectedCard === "" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="bankId">Banka</Label>
                      <Select value={selectedBank} onValueChange={setSelectedBank}>
                        <SelectTrigger id="bankId">
                          <SelectValue placeholder="Banka seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {banks.map((bank) => (
                            <SelectItem key={bank.id} value={bank.id}>
                              {bank.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="installment">Taksit</Label>
                      <Select
                        value={installmentCount.toString()}
                        onValueChange={(value) => setInstallmentCount(Number(value))}
                      >
                        <SelectTrigger id="installment">
                          <SelectValue placeholder="Taksit seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableInstallments().map((option) => (
                            <SelectItem key={option.count} value={option.count.toString()}>
                              {option.count === 1
                                ? "Tek Çekim"
                                : `${option.count} Taksit ${option.commissionRate > 0 ? `(+%${option.commissionRate})` : ""
                                }`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="use3DSecure"
                    checked={use3DSecure}
                    onCheckedChange={(checked) => setUse3DSecure(!!checked)}
                  />
                  <Label htmlFor="use3DSecure">3D Secure ile öde (Önerilen)</Label>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="wallet" className="space-y-4 pt-4">
              <div className="rounded-md bg-muted p-4 text-center">
                <p>Cüzdan ödemesi şu anda desteklenmiyor.</p>
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Hata</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => router.back()} disabled={loading}>
            Geri
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "İşleniyor..." : `${totalAmount.toFixed(2)} TL Öde`}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
