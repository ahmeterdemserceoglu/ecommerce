"use client"

import type React from "react"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Loader2, ArrowLeft, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function EditStorePage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise)
  const { id } = params

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [store, setStore] = useState<any>(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    fetchStoreDetails()
  }, [id])

  const fetchStoreDetails = async () => {
    try {
      setLoading(true)

      // Kullanıcı oturumunu kontrol et
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !sessionData.session) {
        toast({
          title: "Oturum hatası",
          description: "Lütfen tekrar giriş yapın",
          variant: "destructive",
        })
        router.push("/auth/login")
        return
      }

      const userId = sessionData.session.user.id

      const { data, error } = await supabase.from("stores").select("*").eq("id", id).eq("user_id", userId).single()

      if (error) {
        console.error("Mağaza bilgileri alınamadı:", error)
        toast({
          title: "Hata",
          description: "Mağaza bilgileri alınamadı: " + error.message,
          variant: "destructive",
        })
        router.push("/seller/stores")
        return
      }

      if (!data) {
        toast({
          title: "Hata",
          description: "Mağaza bulunamadı veya bu mağazaya erişim izniniz yok",
          variant: "destructive",
        })
        router.push("/seller/stores")
        return
      }

      setStore(data)
    } catch (error: any) {
      console.error("Beklenmeyen bir hata oluştu:", error)
      toast({
        title: "Hata",
        description: "Beklenmeyen bir hata oluştu: " + error.message,
        variant: "destructive",
      })
      router.push("/seller/stores")
    } finally {
      setLoading(false)
    }
  }

  const updateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)

      // Kullanıcı oturumunu kontrol et
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !sessionData.session) {
        toast({
          title: "Oturum hatası",
          description: "Lütfen tekrar giriş yapın",
          variant: "destructive",
        })
        router.push("/auth/login")
        return
      }

      const userId = sessionData.session.user.id

      const { error } = await supabase
        .from("stores")
        .update({
          name: store.name,
          description: store.description,
          banner_url: store.banner_url || null,
          logo_url: store.logo_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userId)

      if (error) {
        console.error("Mağaza güncellenemedi:", error)
        toast({
          title: "Hata",
          description: "Mağaza güncellenemedi: " + error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Başarılı",
        description: "Mağaza bilgileri başarıyla güncellendi",
      })
    } catch (error: any) {
      console.error("Beklenmeyen bir hata oluştu:", error)
      toast({
        title: "Hata",
        description: "Beklenmeyen bir hata oluştu: " + error.message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const deleteStore = async () => {
    try {
      setDeleting(true)

      // Kullanıcı oturumunu kontrol et
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !sessionData.session) {
        toast({
          title: "Oturum hatası",
          description: "Lütfen tekrar giriş yapın",
          variant: "destructive",
        })
        router.push("/auth/login")
        return
      }

      const userId = sessionData.session.user.id

      // Önce mağazaya ait ürünleri kontrol et
      const { data: products, error: productsError } = await supabase.from("products").select("id").eq("store_id", id)

      if (productsError) {
        console.error("Ürünler kontrol edilemedi:", productsError)
        toast({
          title: "Hata",
          description: "Mağaza silinemedi: Ürünler kontrol edilemedi",
          variant: "destructive",
        })
        return
      }

      if (products && products.length > 0) {
        toast({
          title: "Uyarı",
          description: `Bu mağazaya ait ${products.length} ürün bulunuyor. Mağazayı silmeden önce ürünleri silmelisiniz.`,
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase.from("stores").delete().eq("id", id).eq("user_id", userId)

      if (error) {
        console.error("Mağaza silinemedi:", error)
        toast({
          title: "Hata",
          description: "Mağaza silinemedi: " + error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Başarılı",
        description: "Mağaza başarıyla silindi",
      })
      router.push("/seller/stores")
    } catch (error: any) {
      console.error("Beklenmeyen bir hata oluştu:", error)
      toast({
        title: "Hata",
        description: "Beklenmeyen bir hata oluştu: " + error.message,
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!store) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Mağaza bulunamadı</h1>
          <Button onClick={() => router.push("/seller/stores")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Mağazalara Dön
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.push("/seller/stores")} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri
        </Button>
        <h1 className="text-3xl font-bold">Mağaza Düzenle</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mağaza Bilgileri</CardTitle>
          <CardDescription>Mağaza bilgilerini güncelleyin</CardDescription>
        </CardHeader>
        <form onSubmit={updateStore}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Mağaza Adı</Label>
              <Input
                id="name"
                placeholder="Mağaza adını girin"
                value={store.name}
                onChange={(e) => setStore({ ...store, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Mağaza Açıklaması</Label>
              <Textarea
                id="description"
                placeholder="Mağaza açıklamasını girin"
                value={store.description || ""}
                onChange={(e) => setStore({ ...store, description: e.target.value })}
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                placeholder="Logo URL'sini girin"
                value={store.logo_url || ""}
                onChange={(e) => setStore({ ...store, logo_url: e.target.value })}
              />
              {store.logo_url && (
                <div className="mt-2 h-20 w-20 rounded-full overflow-hidden border">
                  <img
                    src={store.logo_url || "/placeholder.svg"}
                    alt="Logo önizleme"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      ; (e.target as HTMLImageElement).src = "/placeholder.svg?height=80&width=80"
                    }}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner_url">Banner URL</Label>
              <Input
                id="banner_url"
                placeholder="Banner URL'sini girin"
                value={store.banner_url || ""}
                onChange={(e) => setStore({ ...store, banner_url: e.target.value })}
              />
              {store.banner_url && (
                <div className="mt-2 h-40 w-full overflow-hidden rounded-md border">
                  <img
                    src={store.banner_url || "/placeholder.svg"}
                    alt="Banner önizleme"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      ; (e.target as HTMLImageElement).src = "/placeholder.svg?height=160&width=640"
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" type="button" disabled={deleting}>
                  {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Mağazayı Sil
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Mağazayı silmek istediğinize emin misiniz?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bu işlem geri alınamaz. Mağaza ve ilişkili tüm veriler kalıcı olarak silinecektir.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteStore} className="bg-red-600 hover:bg-red-700">
                    Evet, Sil
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Değişiklikleri Kaydet
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
