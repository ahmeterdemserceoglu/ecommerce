"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function SellerSettingsPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [storeData, setStoreData] = useState<any>(null)
  const [formData, setFormData] = useState({
    store_name: "",
    description: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    logo_url: "",
    banner_url: "",
    social_media: {
      instagram: "",
      facebook: "",
      twitter: "",
    },
  })
  const [authChecked, setAuthChecked] = useState(false)

  // Oturum kontrolünü düzeltme
  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error("Oturum hatası:", sessionError.message)
          setError("Oturum bilgileriniz alınamadı. Lütfen tekrar giriş yapın.")
          router.push("/auth/login?returnTo=/seller/settings")
          return
        }

        if (!session) {
          console.log("Oturum bulunamadı")
          setError("Bu sayfayı görüntülemek için giriş yapmalısınız.")
          router.push("/auth/login?returnTo=/seller/settings")
          return
        }

        setAuthChecked(true)
        await fetchStoreData(session.user.id)
      } catch (err) {
        console.error("Oturum kontrolü hatası:", err)
        setError("Bir hata oluştu. Lütfen tekrar deneyin.")
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, supabase])

  // Mağaza verilerini getir
  async function fetchStoreData(userId: string) {
    setLoading(true)
    setError(null)

    try {
      // Kullanıcının rolünü kontrol et
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single()

      if (profileError) {
        throw profileError
      }

      // Kullanıcı satıcı veya admin değilse hata göster
      if (!profileData || (profileData.role !== "seller" && profileData.role !== "admin")) {
        setError("Satıcı hesabınız bulunamadı. Lütfen önce satıcı başvurusu yapın.")
        setLoading(false)
        return
      }

      // Mağaza verilerini doğrudan user_id ile getir
      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (storeError && storeError.code !== "PGRST116") {
        throw storeError
      }

      if (storeData) {
        setStoreData(storeData)
        setFormData({
          store_name: storeData.store_name || storeData.name || "",
          description: storeData.description || "",
          contact_email: storeData.contact_email || "",
          contact_phone: storeData.contact_phone || "",
          address: storeData.address || "",
          logo_url: storeData.logo_url || "",
          banner_url: storeData.banner_url || "",
          social_media: storeData.social_media || {
            instagram: "",
            facebook: "",
            twitter: "",
          },
        })
      }

      setLoading(false)
    } catch (err: any) {
      console.error("Mağaza verisi getirme hatası:", err.message)
      setError("Mağaza bilgileri alınamadı: " + (err.message || "Bilinmeyen hata"))
      setLoading(false)
    }
  }

  // Form değişikliklerini işle
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    if (name.includes(".")) {
      const [parent, child] = name.split(".")
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent as keyof typeof formData],
          [child]: value,
        },
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
  }

  // Formu kaydet
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        throw new Error("Oturum bilgileriniz alınamadı. Lütfen tekrar giriş yapın.")
      }

      const userId = session.user.id

      if (storeData) {
        // Mağaza güncelle
        const { error: updateError } = await supabase
          .from("stores")
          .update({
            store_name: formData.store_name,
            name: formData.store_name, // Ensure both name and store_name are updated
            description: formData.description,
            contact_email: formData.contact_email,
            contact_phone: formData.contact_phone,
            address: formData.address,
            logo_url: formData.logo_url,
            banner_url: formData.banner_url,
            social_media: formData.social_media,
            updated_at: new Date().toISOString(),
          })
          .eq("id", storeData.id)

        if (updateError) throw updateError
      } else {
        // Yeni mağaza oluştur
        const { error: insertError } = await supabase.from("stores").insert({
          user_id: userId,
          store_name: formData.store_name,
          name: formData.store_name, // Set both name and store_name
          description: formData.description,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          address: formData.address,
          logo_url: formData.logo_url,
          banner_url: formData.banner_url,
          social_media: formData.social_media,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (insertError) throw insertError
      }

      setSuccess("Mağaza ayarları başarıyla kaydedildi.")
      toast({
        title: "Başarılı",
        description: "Mağaza ayarları kaydedildi.",
      })

      // Mağaza verilerini yeniden yükle
      await fetchStoreData(userId)
    } catch (err: any) {
      console.error("Kaydetme hatası:", err.message)
      setError("Ayarlar kaydedilemedi: " + (err.message || "Bilinmeyen hata"))
      toast({
        title: "Hata",
        description: "Ayarlar kaydedilemedi. Lütfen tekrar deneyin.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!authChecked) {
    return (
      <div className="container mx-auto py-10 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Oturum kontrol ediliyor...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Mağaza bilgileri yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Satıcı Ayarları</h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Hata</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-600">Başarılı</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="store" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="store">Mağaza Bilgileri</TabsTrigger>
          <TabsTrigger value="appearance">Görünüm</TabsTrigger>
          <TabsTrigger value="contact">İletişim</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit}>
          <TabsContent value="store">
            <Card>
              <CardHeader>
                <CardTitle>Mağaza Bilgileri</CardTitle>
                <CardDescription>Mağazanızın temel bilgilerini buradan düzenleyebilirsiniz.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="store_name">Mağaza Adı</Label>
                  <Input
                    id="store_name"
                    name="store_name"
                    value={formData.store_name}
                    onChange={handleChange}
                    placeholder="Mağaza adınızı girin"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Mağaza Açıklaması</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Mağazanızı kısaca tanıtın"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Görünüm Ayarları</CardTitle>
                <CardDescription>Mağazanızın görsel öğelerini buradan düzenleyebilirsiniz.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logo_url">Logo URL</Label>
                  <Input
                    id="logo_url"
                    name="logo_url"
                    value={formData.logo_url}
                    onChange={handleChange}
                    placeholder="Logo URL'nizi girin"
                  />
                  {formData.logo_url && (
                    <div className="mt-2 p-2 border rounded">
                      <p className="text-sm mb-1">Önizleme:</p>
                      <img
                        src={formData.logo_url || "/placeholder.svg"}
                        alt="Logo önizleme"
                        className="h-16 object-contain"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=64&width=64"
                          ;(e.target as HTMLImageElement).alt = "Görüntü yüklenemedi"
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="banner_url">Banner URL</Label>
                  <Input
                    id="banner_url"
                    name="banner_url"
                    value={formData.banner_url}
                    onChange={handleChange}
                    placeholder="Banner URL'nizi girin"
                  />
                  {formData.banner_url && (
                    <div className="mt-2 p-2 border rounded">
                      <p className="text-sm mb-1">Önizleme:</p>
                      <img
                        src={formData.banner_url || "/placeholder.svg"}
                        alt="Banner önizleme"
                        className="w-full h-32 object-cover rounded"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=128&width=400"
                          ;(e.target as HTMLImageElement).alt = "Görüntü yüklenemedi"
                        }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle>İletişim Bilgileri</CardTitle>
                <CardDescription>
                  Müşterilerinizin size ulaşabileceği iletişim bilgilerini buradan düzenleyebilirsiniz.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">E-posta Adresi</Label>
                  <Input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={handleChange}
                    placeholder="İletişim e-posta adresinizi girin"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Telefon Numarası</Label>
                  <Input
                    id="contact_phone"
                    name="contact_phone"
                    value={formData.contact_phone}
                    onChange={handleChange}
                    placeholder="İletişim telefon numaranızı girin"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Adres</Label>
                  <Textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Mağaza adresinizi girin"
                    rows={3}
                  />
                </div>
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium mb-4">Sosyal Medya</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="social_media.instagram">Instagram</Label>
                      <Input
                        id="social_media.instagram"
                        name="social_media.instagram"
                        value={formData.social_media.instagram}
                        onChange={handleChange}
                        placeholder="Instagram kullanıcı adınız"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="social_media.facebook">Facebook</Label>
                      <Input
                        id="social_media.facebook"
                        name="social_media.facebook"
                        value={formData.social_media.facebook}
                        onChange={handleChange}
                        placeholder="Facebook sayfanız"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="social_media.twitter">Twitter</Label>
                      <Input
                        id="social_media.twitter"
                        name="social_media.twitter"
                        value={formData.social_media.twitter}
                        onChange={handleChange}
                        placeholder="Twitter kullanıcı adınız"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  )
}
