"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { Loader2, Store, Plus } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export default function StoresPage() {
  const [loading, setLoading] = useState(true)
  const [stores, setStores] = useState<any[]>([])
  const [newStore, setNewStore] = useState({
    name: "",
    description: "",
    banner_url: "",
    logo_url: "",
  })
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error("Oturum hatası:", sessionError.message)
          toast({
            title: "Oturum hatası",
            description: "Lütfen tekrar giriş yapın",
            variant: "destructive",
          })
          router.push("/auth/login?returnTo=/seller/stores")
          return
        }

        if (!sessionData.session) {
          console.log("Oturum bulunamadı")
          router.push("/auth/login?returnTo=/seller/stores")
          return
        }

        fetchStores()
      } catch (error: any) {
        console.error("Beklenmeyen bir hata oluştu:", error)
        toast({
          title: "Hata",
          description: "Beklenmeyen bir hata oluştu: " + error.message,
          variant: "destructive",
        })
      }
    }

    checkAuth()
  }, [])

  const fetchStores = async () => {
    try {
      setLoading(true)

      // Önce kullanıcı oturumunu kontrol et
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

      const { data, error } = await supabase.from("stores").select("*").eq("user_id", userId)

      if (error) {
        console.error("Mağaza bilgileri alınamadı:", error)
        toast({
          title: "Hata",
          description: "Mağaza bilgileri alınamadı: " + error.message,
          variant: "destructive",
        })
        return
      }

      setStores(data || [])
    } catch (error: any) {
      console.error("Beklenmeyen bir hata oluştu:", error)
      toast({
        title: "Hata",
        description: "Beklenmeyen bir hata oluştu: " + error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createStore = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setCreating(true)

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

      const { data, error } = await supabase
        .from("stores")
        .insert({
          name: newStore.name,
          description: newStore.description,
          banner_url: newStore.banner_url || null,
          logo_url: newStore.logo_url || null,
          user_id: userId,
        })
        .select()

      if (error) {
        console.error("Mağaza oluşturma hatası:", error)
        toast({
          title: "Hata",
          description: "Mağaza oluşturulamadı: " + error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Başarılı",
        description: "Mağaza başarıyla oluşturuldu",
      })

      setNewStore({
        name: "",
        description: "",
        banner_url: "",
        logo_url: "",
      })

      setShowForm(false)
      fetchStores()
    } catch (error: any) {
      console.error("Beklenmeyen bir hata oluştu:", error)
      toast({
        title: "Hata",
        description: "Beklenmeyen bir hata oluştu: " + error.message,
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mağazam</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Mağaza Ekle
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Yeni Mağaza Oluştur</CardTitle>
            <CardDescription>Mağaza bilgilerini girin</CardDescription>
          </CardHeader>
          <form onSubmit={createStore}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Mağaza Adı</Label>
                <Input
                  id="name"
                  placeholder="Mağaza adını girin"
                  value={newStore.name}
                  onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mağaza Açıklaması</Label>
                <Textarea
                  id="description"
                  placeholder="Mağaza açıklamasını girin"
                  value={newStore.description}
                  onChange={(e) => setNewStore({ ...newStore, description: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo URL (İsteğe bağlı)</Label>
                <Input
                  id="logo_url"
                  placeholder="Logo URL'sini girin"
                  value={newStore.logo_url}
                  onChange={(e) => setNewStore({ ...newStore, logo_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner_url">Banner URL (İsteğe bağlı)</Label>
                <Input
                  id="banner_url"
                  placeholder="Banner URL'sini girin"
                  value={newStore.banner_url}
                  onChange={(e) => setNewStore({ ...newStore, banner_url: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mağaza Oluştur
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : stores.length === 0 ? (
        <div className="text-center py-10">
          <Store className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium">Henüz mağazanız yok</h3>
          <p className="mt-1 text-gray-500">Yeni bir mağaza oluşturmak için yukarıdaki butona tıklayın.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => (
            <Card key={store.id} className="overflow-hidden">
              {store.banner_url && (
                <div className="h-40 overflow-hidden">
                  <img
                    src={store.banner_url || "/placeholder.svg"}
                    alt={`${store.name} banner`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=160&width=320"
                    }}
                  />
                </div>
              )}
              <CardHeader className="flex flex-row items-center gap-4">
                {store.logo_url ? (
                  <div className="h-12 w-12 rounded-full overflow-hidden">
                    <img
                      src={store.logo_url || "/placeholder.svg"}
                      alt={`${store.name} logo`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=48&width=48"
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <Store className="h-6 w-6 text-gray-500" />
                  </div>
                )}
                <div>
                  <CardTitle>{store.name}</CardTitle>
                  <CardDescription className="line-clamp-1">{store.description || "Açıklama yok"}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 line-clamp-3">
                  {store.description || "Bu mağaza için henüz bir açıklama eklenmemiş."}
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/seller/stores/${store.id}/edit`)}
                >
                  Mağazayı Düzenle
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
