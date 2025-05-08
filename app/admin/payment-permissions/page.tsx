"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function PaymentPermissionsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const updatePermissions = async () => {
    try {
      setLoading(true)
      setResult(null)

      const response = await fetch("/api/admin/update-payment-permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Ödeme izinleri güncellenirken bir hata oluştu")
      }

      setResult({
        success: true,
        message: data.message || "Ödeme izinleri başarıyla güncellendi",
      })
    } catch (error: any) {
      console.error("Ödeme izinleri güncellenirken hata:", error)
      setResult({
        success: false,
        message: error.message || "Ödeme izinleri güncellenirken bir hata oluştu",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Ödeme İzinleri Yönetimi</h1>

      <Card>
        <CardHeader>
          <CardTitle>Ödeme İzinlerini Güncelle</CardTitle>
          <CardDescription>
            Bu işlem, ödeme tabloları için gerekli Row Level Security (RLS) politikalarını oluşturur veya günceller.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Ödeme sistemi tablolarına (card_tokens, banks, payment_methods) erişim izinlerini düzenlemek için aşağıdaki
            butona tıklayın. Bu işlem:
          </p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Gerekli tabloların varlığını kontrol eder ve yoksa oluşturur</li>
            <li>Row Level Security (RLS) politikalarını ayarlar</li>
            <li>Kullanıcıların kendi kartlarına erişmesine izin verir</li>
            <li>Örnek banka ve ödeme yöntemi verilerini ekler (eğer yoksa)</li>
          </ul>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"} className="mb-4">
              {result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{result.success ? "Başarılı" : "Hata"}</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={updatePermissions} disabled={loading}>
            {loading ? "Güncelleniyor..." : "İzinleri Güncelle"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
