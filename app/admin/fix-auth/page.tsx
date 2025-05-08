"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function FixAuthPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleFixAuth = async () => {
    try {
      setIsLoading(true)
      setStatus("loading")

      const response = await fetch("/api/admin/fix-auth-issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Kimlik doğrulama sorunları düzeltilirken bir hata oluştu.")
      }

      setStatus("success")
      toast({
        title: "İşlem başarılı",
        description: "Kimlik doğrulama sorunları başarıyla düzeltildi.",
      })

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/admin/dashboard")
        router.refresh()
      }, 2000)
    } catch (error: any) {
      setStatus("error")
      setErrorMessage(error.message)
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshPage = () => {
    router.refresh()
    window.location.reload()
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Kimlik Doğrulama Sorunlarını Düzelt</CardTitle>
          <CardDescription>
            Bu araç, oturum açma ve kimlik doğrulama ile ilgili sorunları düzeltmenize yardımcı olur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "success" && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">İşlem başarılı</AlertTitle>
              <AlertDescription className="text-green-700">
                Kimlik doğrulama sorunları başarıyla düzeltildi. Yönlendiriliyorsunuz...
              </AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert className="mb-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Hata</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <p className="text-sm text-gray-500 mb-4">
            Bu işlem, oturum sürelerini uzatır, eksik profil kayıtlarını oluşturur ve kimlik doğrulama performansını
            iyileştirir.
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleRefreshPage} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sayfayı Yenile
          </Button>
          <Button onClick={handleFixAuth} disabled={isLoading || status === "success"}>
            {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            {!isLoading && status !== "success" && "Sorunları Düzelt"}
            {!isLoading && status === "success" && "Düzeltildi"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
