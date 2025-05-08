"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Check } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import AccountSidebar from "@/components/account/account-sidebar"

export default function AccountPage() {
  const { user, updateProfile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    avatarUrl: user?.avatarUrl || "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await updateProfile({
        fullName: formData.fullName,
        avatarUrl: formData.avatarUrl,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        toast({
          title: "Profil güncellendi",
          description: "Profil bilgileriniz başarıyla güncellendi.",
        })
      }
    } catch (error: any) {
      setError("Profil güncellenirken bir hata oluştu.")
      console.error("Profile update error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/4">
          <AccountSidebar />
        </div>
        <div className="w-full md:w-3/4">
          <h1 className="text-2xl font-bold mb-6">Hesap Bilgilerim</h1>

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
              <AlertTitle>Başarılı</AlertTitle>
              <AlertDescription>Profil bilgileriniz başarıyla güncellendi.</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profil Bilgileri</CardTitle>
                <CardDescription>Kişisel bilgilerinizi güncelleyin</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={formData.avatarUrl || "/placeholder.svg"} alt={formData.fullName} />
                      <AvatarFallback>
                        {formData.fullName?.charAt(0) || formData.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{formData.fullName || "Kullanıcı"}</p>
                      <p className="text-sm text-muted-foreground">{formData.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Ad Soyad</Label>
                    <Input id="fullName" value={formData.fullName} onChange={handleChange} placeholder="Ad Soyad" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta</Label>
                    <Input id="email" value={formData.email} disabled placeholder="E-posta" />
                    <p className="text-xs text-muted-foreground">E-posta adresinizi değiştiremezsiniz.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatarUrl">Profil Resmi URL</Label>
                    <Input
                      id="avatarUrl"
                      value={formData.avatarUrl}
                      onChange={handleChange}
                      placeholder="https://example.com/avatar.jpg"
                    />
                    <p className="text-xs text-muted-foreground">Profil resminizin URL adresini girin.</p>
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading ? "Güncelleniyor..." : "Bilgileri Güncelle"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Şifre Değiştir</CardTitle>
                <CardDescription>Hesap güvenliğiniz için şifrenizi düzenli olarak değiştirin</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Mevcut Şifre</Label>
                    <Input id="currentPassword" type="password" placeholder="••••••••" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Yeni Şifre</Label>
                    <Input id="newPassword" type="password" placeholder="••••••••" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Yeni Şifre Tekrar</Label>
                    <Input id="confirmPassword" type="password" placeholder="••••••••" />
                  </div>

                  <Button type="submit">Şifreyi Değiştir</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hesap Ayarları</CardTitle>
                <CardDescription>Bildirim ve gizlilik tercihlerinizi yönetin</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Hesap ayarları yakında aktif olacaktır.</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" disabled>
                  Ayarları Güncelle
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hesap Doğrulama</CardTitle>
                <CardDescription>Hesabınızı doğrulayarak daha fazla güvenlik sağlayın</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">E-posta Doğrulama</p>
                      <p className="text-sm text-muted-foreground">E-posta adresinizi doğrulayın</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Doğrula
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Telefon Doğrulama</p>
                      <p className="text-sm text-muted-foreground">Telefon numaranızı doğrulayın</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Ekle
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
