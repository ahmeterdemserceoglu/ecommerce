"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, CreditCard } from "lucide-react"

// Kart formu doğrulama şeması
const cardFormSchema = z.object({
  cardHolderName: z.string().min(3, { message: "Kart sahibi adı en az 3 karakter olmalıdır" }),
  cardNumber: z
    .string()
    .min(16, { message: "Kart numarası en az 16 karakter olmalıdır" })
    .max(19, { message: "Kart numarası en fazla 19 karakter olmalıdır" })
    .regex(/^[0-9]+$/, { message: "Kart numarası sadece rakamlardan oluşmalıdır" }),
  expiryMonth: z.string().min(1, { message: "Son kullanma ayı seçilmelidir" }),
  expiryYear: z.string().min(1, { message: "Son kullanma yılı seçilmelidir" }),
  cvv: z
    .string()
    .min(3, { message: "CVV en az 3 karakter olmalıdır" })
    .max(4, { message: "CVV en fazla 4 karakter olmalıdır" })
    .regex(/^[0-9]+$/, { message: "CVV sadece rakamlardan oluşmalıdır" }),
  cardType: z.string().min(1, { message: "Kart tipi seçilmelidir" }),
  bankId: z.string().optional(),
  makeDefault: z.boolean().default(false),
})

type CardFormValues = z.infer<typeof cardFormSchema>

interface Bank {
  id: string
  name: string
  logo?: string
  supported_card_types?: string[]
}

export default function AddCardForm() {
  const router = useRouter()
  const auth = (useAuth() as any) || {}
  const user = auth.user

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [banks, setBanks] = useState<Bank[]>([])
  const [loadingBanks, setLoadingBanks] = useState(true)

  // Varsayılan bankalar
  const defaultBanks = [
    { id: "1", name: "Garanti BBVA" },
    { id: "2", name: "İş Bankası" },
    { id: "3", name: "Yapı Kredi" },
    { id: "4", name: "Akbank" },
    { id: "5", name: "Ziraat Bankası" },
  ]

  // Form tanımla
  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: {
      cardHolderName: "",
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      cardType: "",
      bankId: "",
      makeDefault: false,
    },
  })

  // Bankaları yükle
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        setLoadingBanks(true)
        setError(null)

        // API üzerinden bankaları al
        const response = await fetch("/api/payment/banks")

        if (!response.ok) {
          throw new Error(`API hatası: ${response.status}`)
        }

        const data = await response.json()

        if (data.banks && Array.isArray(data.banks)) {
          setBanks(data.banks)
        } else {
          // Varsayılan bankalar
          setBanks(defaultBanks)
        }
      } catch (error: any) {
        console.error("Banka yükleme hatası:", error)
        // Hata durumunda varsayılan bankalar
        setBanks(defaultBanks)
      } finally {
        setLoadingBanks(false)
      }
    }

    fetchBanks()
  }, [])

  // Form gönderildiğinde
  const onSubmit = async (data: CardFormValues) => {
    if (!user) {
      setError("Oturum açmanız gerekiyor")
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/payment/methods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Kart eklenirken bir hata oluştu")
      }

      // Başarılı ise ödeme yöntemleri sayfasına yönlendir
      router.push("/hesabim/odeme-yontemlerim")
    } catch (error: any) {
      console.error("Kart ekleme hatası:", error)
      setError(error.message || "Kart eklenirken bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  // Kullanıcı oturum açmamışsa
  useEffect(() => {
    if (auth.isLoaded && !user) {
      router.push("/giris?returnUrl=/hesabim/odeme-yontemlerim/ekle")
    }
  }, [auth.isLoaded, user, router])

  if (auth.isLoaded && !user) {
    return null
  }

  return (
    <div className="container py-10 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Yeni Kart Ekle</CardTitle>
          <CardDescription>Güvenli bir şekilde yeni bir kart ekleyin</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Hata</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="cardHolderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kart Sahibinin Adı</FormLabel>
                    <FormControl>
                      <Input placeholder="Kart üzerindeki isim" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cardNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kart Numarası</FormLabel>
                    <FormControl>
                      <Input placeholder="1234 5678 9012 3456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="expiryMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ay</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Ay" />
                          </SelectTrigger>
                        </FormControl>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiryYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Yıl</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Yıl" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => {
                            const year = (new Date().getFullYear() + i).toString()
                            return (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cvv"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CVV</FormLabel>
                      <FormControl>
                        <Input placeholder="123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="cardType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kart Tipi</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Kart tipini seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="VISA">Visa</SelectItem>
                        <SelectItem value="MASTERCARD">Mastercard</SelectItem>
                        <SelectItem value="TROY">Troy</SelectItem>
                        <SelectItem value="AMEX">American Express</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banka</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Banka seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loadingBanks ? (
                          <div className="p-2">
                            <Skeleton className="h-5 w-full mb-2" />
                            <Skeleton className="h-5 w-full mb-2" />
                            <Skeleton className="h-5 w-full" />
                          </div>
                        ) : (
                          banks.map((bank) => (
                            <SelectItem key={bank.id} value={bank.id}>
                              {bank.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>Opsiyonel</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="makeDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Varsayılan kart olarak ayarla</FormLabel>
                      <FormDescription>
                        Bu kartı gelecekteki ödemeleriniz için varsayılan olarak kullanın
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Kaydediliyor..." : "Kartı Kaydet"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-xs text-muted-foreground">
            <CreditCard className="h-3 w-3 inline mr-1" />
            Kart bilgileriniz güvenli bir şekilde saklanır
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
