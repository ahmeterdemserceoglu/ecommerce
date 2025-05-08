"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Check, Store } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { checkExistingApplication } from "../actions/seller-actions"

export default function SellerApplicationPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingApplication, setExistingApplication] = useState<any>(null)
  const [formData, setFormData] = useState({
    storeName: "",
    storeDescription: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    city: "",
    country: "Türkiye",
    taxId: "",
    website: "",
    ownerName: "",
    businessAddress: "",
  })
  const [acceptTerms, setAcceptTerms] = useState(false)

  // Kullanıcı ve başvuru kontrolü
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/auth/login?returnTo=/satici-ol")
      return
    }

    // Check if user already has a pending or approved application using server action
    const checkUserAndApplication = async () => {
      try {
        const result = await checkExistingApplication()
        if (!result.success) {
          console.error("Error checking application:", result.error)
          setError(result.error || "Başvuru kontrolü sırasında bir hata oluştu.")
          return
        }

        if (result.notAuthenticated) {
          // This is normal during preview, don't show an error
          console.log("User not authenticated yet")
          return
        }

        if (result.existingApplication) {
          setExistingApplication(result.existingApplication)

          // If already approved, redirect to seller dashboard
          if (result.existingApplication.status === "approved") {
            toast({
              title: "Satıcı hesabınız bulunmaktadır",
              description: "Satıcı panelinize yönlendiriliyorsunuz.",
            })
            router.push("/seller/dashboard")
          }
          // If pending, show pending message
          else if (result.existingApplication.status === "pending") {
            toast({
              title: "Bekleyen başvurunuz bulunmaktadır",
              description: "Başvurunuz inceleme aşamasındadır.",
            })
          }
        }
      } catch (error: any) {
        console.error("Error checking application:", error)
        setError("Başvuru kontrolü sırasında bir hata oluştu.")
      }

      // Kullanıcı bilgilerini form verilerine ekle
      if (user) {
        setFormData((prev) => ({
          ...prev,
          contactEmail: user.email,
          ownerName: user.full_name || "",
        }))
      }
    }

    checkUserAndApplication()
  }, [user, authLoading, router, toast])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    })
  }

  const validateForm = () => {
    if (!formData.storeName.trim()) {
      setError("Mağaza adı gereklidir.")
      return false
    }
    if (!formData.ownerName.trim()) {
      setError("Mağaza sahibi adı gereklidir.")
      return false
    }
    if (!formData.businessAddress.trim()) {
      setError("İşletme adresi gereklidir.")
      return false
    }
    if (!formData.storeDescription.trim()) {
      setError("Mağaza açıklaması gereklidir.")
      return false
    }
    if (!formData.contactPhone.trim()) {
      setError("İletişim telefonu gereklidir.")
      return false
    }
    if (!formData.address.trim() || !formData.city.trim()) {
      setError("Adres ve şehir bilgileri gereklidir.")
      return false
    }
    if (!formData.taxId.trim()) {
      setError("Vergi numarası gereklidir.")
      return false
    }
    if (!acceptTerms) {
      setError("Satıcı sözleşmesini kabul etmelisiniz.")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (authLoading) {
      setError("Lütfen oturum bilgilerinizin yüklenmesini bekleyin.")
      return
    }
    if (!user) {
      setError("Lütfen başvuru göndermek için giriş yapın.")
      toast({
        title: "Oturum hatası",
        description: "Lütfen başvuru göndermek için giriş yapın.",
        variant: "destructive",
      })
      router.push("/auth/login?returnTo=/satici-ol")
      return
    }
    if (!validateForm()) {
      return
    }
    setLoading(true)
    try {
      const response = await fetch("/api/seller/applications/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          userId: user.id,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "API error")
      }
      const data = await response.json()
      setSuccess(true)
      toast({
        title: "Başvuru gönderildi",
        description: "Satıcı başvurunuz başarıyla alındı. İnceleme sonrası size bilgi verilecektir.",
      })
      setTimeout(() => {
        router.push("/")
      }, 3000)
    } catch (error: any) {
      console.error("Seller application error:", error)
      setError(error?.message || "Başvuru gönderilirken bir hata oluştu.")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="container max-w-6xl flex min-h-[calc(100vh-200px)] items-center justify-center py-10">
        <p>Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl flex min-h-[calc(100vh-200px)] items-center justify-center py-10">
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Store className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-2xl">Satıcı Başvurusu</CardTitle>
          </div>
          <CardDescription>HDTicaret'te mağaza açmak için başvurun</CardDescription>
        </CardHeader>
        <CardContent>
          {existingApplication && existingApplication.status === "pending" && (
            <Alert className="mb-6 border-amber-500 text-amber-700">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Bekleyen Başvuru</AlertTitle>
              <AlertDescription>
                Zaten bekleyen bir satıcı başvurunuz bulunmaktadır. Başvurunuz incelendikten sonra size e-posta ile
                bilgi verilecektir.
              </AlertDescription>
            </Alert>
          )}

          {existingApplication && existingApplication.status === "rejected" && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Reddedilen Başvuru</AlertTitle>
              <AlertDescription>
                Önceki başvurunuz reddedilmiştir. Aşağıdaki formu doldurarak yeniden başvurabilirsiniz.
                {existingApplication.admin_notes && (
                  <div className="mt-2 p-2 bg-red-50 rounded-md">
                    <strong>Red nedeni:</strong> {existingApplication.admin_notes}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Hata</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-green-500 text-green-700">
              <Check className="h-4 w-4" />
              <AlertTitle>Başvuru Alındı</AlertTitle>
              <AlertDescription>
                Satıcı başvurunuz başarıyla alındı. Başvurunuz incelendikten sonra size e-posta ile bilgi verilecektir.
                Ana sayfaya yönlendiriliyorsunuz...
              </AlertDescription>
            </Alert>
          )}

          {(!existingApplication || existingApplication.status === "rejected") && !success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeName">Mağaza Adı</Label>
                <Input
                  id="storeName"
                  placeholder="Mağazanızın adı"
                  value={formData.storeName}
                  onChange={handleChange}
                  disabled={loading || success}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerName">Mağaza Sahibi Adı</Label>
                <Input
                  id="ownerName"
                  placeholder="Ad Soyad"
                  value={formData.ownerName}
                  onChange={handleChange}
                  disabled={loading || success}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessAddress">İşletme Adresi</Label>
                <Input
                  id="businessAddress"
                  placeholder="İşletme adresinizi girin"
                  value={formData.businessAddress}
                  onChange={handleChange}
                  disabled={loading || success}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storeDescription">Mağaza Açıklaması</Label>
                <Textarea
                  id="storeDescription"
                  placeholder="Mağazanız hakkında kısa bir açıklama"
                  value={formData.storeDescription}
                  onChange={handleChange}
                  disabled={loading || success}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">İletişim E-postası</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="iletisim@magaza.com"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    disabled={loading || success}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">İletişim Telefonu</Label>
                  <Input
                    id="contactPhone"
                    placeholder="0555 123 4567"
                    value={formData.contactPhone}
                    onChange={handleChange}
                    disabled={loading || success}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Textarea
                  id="address"
                  placeholder="Mağazanızın adresi"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={loading || success}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Şehir</Label>
                  <Input
                    id="city"
                    placeholder="İstanbul"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={loading || success}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Ülke</Label>
                  <Input
                    id="country"
                    placeholder="Türkiye"
                    value={formData.country}
                    onChange={handleChange}
                    disabled={loading || success}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxId">Vergi Numarası</Label>
                  <Input
                    id="taxId"
                    placeholder="Vergi/TC Kimlik Numarası"
                    value={formData.taxId}
                    onChange={handleChange}
                    disabled={loading || success}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Web Sitesi (Opsiyonel)</Label>
                  <Input
                    id="website"
                    placeholder="https://www.ornek.com"
                    value={formData.website}
                    onChange={handleChange}
                    disabled={loading || success}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  disabled={loading || success}
                />
                <label
                  htmlFor="terms"
                  className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  <Link href="/satici-sozlesmesi" className="text-primary hover:underline">
                    Satıcı Sözleşmesi
                  </Link>
                  'ni okudum ve kabul ediyorum
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={loading || success}>
                {loading ? "Başvuru Gönderiliyor..." : "Başvuru Gönder"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Başvurunuz incelendikten sonra size e-posta ile bilgi verilecektir.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
