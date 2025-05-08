"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function PaymentResultPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState<boolean | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function processPaymentResult() {
      try {
        setLoading(true)

        // 3D Secure sonucu parametrelerini al
        const transactionId = searchParams.get("transactionId")
        const paymentId = searchParams.get("paymentId")
        const status = searchParams.get("status")
        const bankResponseData = {}

        // URL parametrelerini bankResponseData'ya ekle
        searchParams.forEach((value, key) => {
          if (key !== "transactionId" && key !== "paymentId" && key !== "status") {
            // @ts-ignore
            bankResponseData[key] = value
          }
        })

        if (!transactionId || !paymentId || !status) {
          setError("Geçersiz ödeme yanıtı. Eksik parametreler.")
          setSuccess(false)
          return
        }

        setProcessing(true)

        // Ödeme sonucunu işle
        const response = await fetch("/api/payment/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transactionId,
            paymentId,
            status,
            bankResponseData,
          }),
        })

        const result = await response.json()

        if (result.success) {
          setSuccess(true)
          setOrderId(result.orderId)
          toast({
            title: "Ödeme Başarılı",
            description: "Ödemeniz başarıyla tamamlandı.",
          })
        } else {
          setSuccess(false)
          setError(result.error || "Ödeme işlemi tamamlanamadı.")
          toast({
            title: "Ödeme Başarısız",
            description: result.error || "Ödeme işlemi tamamlanamadı.",
            variant: "destructive",
          })
        }
      } catch (error: any) {
        console.error("Ödeme sonucu işlenirken hata:", error)
        setSuccess(false)
        setError(error.message || "Ödeme sonucu işlenirken bir hata oluştu.")
        toast({
          title: "Hata",
          description: error.message || "Ödeme sonucu işlenirken bir hata oluştu.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
        setProcessing(false)
      }
    }

    processPaymentResult()
  }, [searchParams, toast, router, supabase])

  if (loading || processing) {
    return (
      <div className="container max-w-md mx-auto py-10 px-4">
        <Card>
          <CardHeader className="text-center">
            <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
            <CardTitle>
              <Skeleton className="h-6 w-3/4 mx-auto" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-4 w-1/2 mx-auto" />
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p>Ödeme sonucu işleniyor, lütfen bekleyin...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success === true) {
    return (
      <div className="container max-w-md mx-auto py-10 px-4">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle>Ödeme Başarılı</CardTitle>
            <CardDescription>Ödemeniz başarıyla tamamlandı.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4">Siparişiniz için teşekkür ederiz.</p>
            {orderId && <p className="text-sm text-muted-foreground">Sipariş Numarası: {orderId}</p>}
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => router.push("/")}>
              Ana Sayfaya Dön
            </Button>
            <Button onClick={() => router.push(`/odeme/basarili?orderId=${orderId}`)}>Sipariş Detayları</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-md mx-auto py-10 px-4">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle>Ödeme Başarısız</CardTitle>
          <CardDescription>Ödeme işlemi sırasında bir sorun oluştu.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <p>Lütfen tekrar deneyiniz veya farklı bir ödeme yöntemi kullanınız.</p>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => router.push("/sepet")}>
            Sepete Dön
          </Button>
          <Button variant="destructive" onClick={() => router.push("/odeme/basarisiz")}>
            Hata Detayları
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
