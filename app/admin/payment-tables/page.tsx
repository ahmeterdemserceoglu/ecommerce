"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function PaymentTablesPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const updateTables = async () => {
    try {
      setLoading(true)
      setResult(null)

      const response = await fetch("/api/admin/fix-payment-tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Ödeme tabloları güncellenirken bir hata oluştu")
      }

      setResult({
        success: true,
        message: data.message || "Ödeme tabloları başarıyla güncellendi",
      })
    } catch (error: any) {
      console.error("Ödeme tabloları güncellenirken hata:", error)
      setResult({
        success: false,
        message: error.message || "Ödeme tabloları güncellenirken bir hata oluştu",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Ödeme Tabloları Yönetimi</h1>

      <Card>
        <CardHeader>
          <CardTitle>Ödeme Tablolarını Güncelle</CardTitle>
          <CardDescription>
            Bu işlem, ödeme sistemi için gerekli tabloları oluşturur veya günceller ve örnek veriler ekler.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Ödeme sistemi tablolarını (card_tokens, banks, payment_methods) güncellemek için aşağıdaki butona tıklayın.
            Bu işlem:
          </p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Gerekli tabloların varlığını kontrol eder ve yoksa oluşturur</li>
            <li>Row Level Security (RLS) politikalarını ayarlar</li>
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
          <Button onClick={updateTables} disabled={loading}>
            {loading ? "Güncelleniyor..." : "Tabloları Güncelle"}
          </Button>
        </CardFooter>
      </Card>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Sorun Giderme</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">İzin Hataları</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Eğer ödeme sistemi ile ilgili "permission denied" hataları alıyorsanız, aşağıdaki adımları izleyin:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-sm">
              <li>Yukarıdaki "Tabloları Güncelle" butonuna tıklayın</li>
              <li>Supabase panelinden RLS politikalarını kontrol edin</li>
              <li>
                <code>SUPABASE_SERVICE_ROLE_KEY</code> ortam değişkeninin doğru ayarlandığından emin olun
              </li>
              <li>Uygulamayı yeniden başlatın</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
