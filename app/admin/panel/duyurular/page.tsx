"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Megaphone, Trash2, Edit, Plus, AlertCircle } from "lucide-react"
import AdminLayout from "@/components/admin/AdminLayout"

export default function AnnouncementsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, authLoading } = useAuth()
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "info",
    position: "top",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    isActive: true,
    backgroundColor: "#f0f9ff",
    textColor: "#0369a1",
  })
  const [isEditing, setIsEditing] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is admin
    const checkAdminAuth = async () => {
      if (!authLoading && user) {
        if (user.role !== "admin") {
          router.push("/")
          return
        }

        // Additional check - verify admin role from database
        try {
          const { data, error } = await supabase.from("profiles").select("role").eq("id", user.id).single()

          if (error || data?.role !== "admin") {
            console.error("Admin role verification failed:", error || "Role mismatch")
            router.push("/")
            return
          }
        } catch (err) {
          console.error("Error verifying admin role:", err)
        }
      } else if (!authLoading && !user) {
        // Force refresh the session before redirecting
        try {
          const { data } = await supabase.auth.refreshSession()
          if (!data.session) {
            router.push("/auth/login?returnTo=/admin/panel/duyurular")
          }
        } catch (err) {
          console.error("Session refresh failed:", err)
          router.push("/auth/login?returnTo=/admin/panel/duyurular")
        }
        return
      }

      fetchAnnouncements()
    }

    checkAdminAuth()
  }, [user, authLoading, router, supabase])

  const fetchAnnouncements = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setAnnouncements(data || [])
    } catch (error) {
      console.error("Duyurular yüklenirken hata:", error)
      toast({
        title: "Hata",
        description: "Duyurular yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isActive: checked }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      type: "info",
      position: "top",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      isActive: true,
      backgroundColor: "#f0f9ff",
      textColor: "#0369a1",
    })
    setIsEditing(false)
    setCurrentId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const announcementData = {
        title: formData.title,
        content: formData.content,
        type: formData.type,
        position: formData.position,
        start_date: new Date(formData.startDate).toISOString(),
        end_date: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        is_active: formData.isActive,
        background_color: formData.backgroundColor,
        text_color: formData.textColor,
      }

      if (isEditing && currentId) {
        // Update existing announcement
        const { error } = await supabase.from("announcements").update(announcementData).eq("id", currentId)

        if (error) throw error

        toast({
          title: "Duyuru Güncellendi",
          description: "Duyuru başarıyla güncellendi.",
        })
      } else {
        // Create new announcement
        const { error } = await supabase.from("announcements").insert(announcementData)

        if (error) throw error

        toast({
          title: "Duyuru Eklendi",
          description: "Yeni duyuru başarıyla eklendi.",
        })
      }

      resetForm()
      fetchAnnouncements()
    } catch (error) {
      console.error("Duyuru kaydedilirken hata:", error)
      toast({
        title: "Hata",
        description: "Duyuru kaydedilirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (announcement: any) => {
    setIsEditing(true)
    setCurrentId(announcement.id)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      position: announcement.position,
      startDate: new Date(announcement.start_date).toISOString().split("T")[0],
      endDate: announcement.end_date ? new Date(announcement.end_date).toISOString().split("T")[0] : "",
      isActive: announcement.is_active,
      backgroundColor: announcement.background_color,
      textColor: announcement.text_color,
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bu duyuruyu silmek istediğinize emin misiniz?")) return

    try {
      const { error } = await supabase.from("announcements").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Duyuru Silindi",
        description: "Duyuru başarıyla silindi.",
      })

      fetchAnnouncements()
    } catch (error) {
      console.error("Duyuru silinirken hata:", error)
      toast({
        title: "Hata",
        description: "Duyuru silinirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("announcements").update({ is_active: !currentStatus }).eq("id", id)

      if (error) throw error

      toast({
        title: currentStatus ? "Duyuru Devre Dışı Bırakıldı" : "Duyuru Etkinleştirildi",
        description: currentStatus ? "Duyuru başarıyla devre dışı bırakıldı." : "Duyuru başarıyla etkinleştirildi.",
      })

      fetchAnnouncements()
    } catch (error) {
      console.error("Duyuru durumu güncellenirken hata:", error)
      toast({
        title: "Hata",
        description: "Duyuru durumu güncellenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="container py-10">
          <h1 className="text-2xl font-bold mb-6">Duyurular</h1>
          <div className="flex justify-center py-10">
            <p>Yükleniyor...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="container py-10">
        <h1 className="text-2xl font-bold mb-6">Duyurular</h1>

        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">Duyuru Listesi</TabsTrigger>
            <TabsTrigger value="add">{isEditing ? "Duyuru Düzenle" : "Yeni Duyuru Ekle"}</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            {announcements.length > 0 ? (
              <div className="grid gap-4">
                {announcements.map((announcement) => (
                  <Card key={announcement.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{announcement.title}</h3>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${announcement.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                                }`}
                            >
                              {announcement.is_active ? "Aktif" : "Pasif"}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{announcement.content}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>Konum: {announcement.position === "top" ? "Üst" : "Alt"}</span>
                            <span>Başlangıç: {new Date(announcement.start_date).toLocaleDateString("tr-TR")}</span>
                            {announcement.end_date && (
                              <span>Bitiş: {new Date(announcement.end_date).toLocaleDateString("tr-TR")}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(announcement.id, announcement.is_active)}
                          >
                            {announcement.is_active ? "Devre Dışı Bırak" : "Etkinleştir"}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(announcement)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(announcement.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div
                          className="p-2 rounded text-sm"
                          style={{
                            backgroundColor: announcement.background_color,
                            color: announcement.text_color,
                          }}
                        >
                          {announcement.content}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-10">
                <CardContent>
                  <Megaphone className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-medium mb-2">Henüz duyuru bulunmuyor</h2>
                  <p className="text-muted-foreground mb-6">
                    Yeni bir duyuru eklemek için "Yeni Duyuru Ekle" sekmesini kullanabilirsiniz.
                  </p>
                  <Button
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={() => document.querySelector('[value="add"]')?.click()}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Yeni Duyuru Ekle
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="add" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{isEditing ? "Duyuru Düzenle" : "Yeni Duyuru Ekle"}</CardTitle>
                <CardDescription>
                  {isEditing ? "Mevcut duyuruyu düzenleyin." : "Sitenizde görüntülenecek yeni bir duyuru ekleyin."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Başlık</Label>
                      <Input id="title" name="title" value={formData.title} onChange={handleInputChange} required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="position">Konum</Label>
                      <Select value={formData.position} onValueChange={(value) => handleSelectChange("position", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Konum seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Üst</SelectItem>
                          <SelectItem value="bottom">Alt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">İçerik</Label>
                    <Textarea
                      id="content"
                      name="content"
                      value={formData.content}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Tür</Label>
                      <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tür seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Bilgi</SelectItem>
                          <SelectItem value="warning">Uyarı</SelectItem>
                          <SelectItem value="success">Başarı</SelectItem>
                          <SelectItem value="error">Hata</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="startDate">Başlangıç Tarihi</Label>
                      <Input
                        id="startDate"
                        name="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endDate">Bitiş Tarihi (Opsiyonel)</Label>
                      <Input
                        id="endDate"
                        name="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="backgroundColor">Arka Plan Rengi</Label>
                      <div className="flex gap-2">
                        <Input
                          id="backgroundColor"
                          name="backgroundColor"
                          type="color"
                          value={formData.backgroundColor}
                          onChange={handleInputChange}
                          className="w-12 h-10 p-1"
                        />
                        <Input name="backgroundColor" value={formData.backgroundColor} onChange={handleInputChange} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="textColor">Yazı Rengi</Label>
                      <div className="flex gap-2">
                        <Input
                          id="textColor"
                          name="textColor"
                          type="color"
                          value={formData.textColor}
                          onChange={handleInputChange}
                          className="w-12 h-10 p-1"
                        />
                        <Input name="textColor" value={formData.textColor} onChange={handleInputChange} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="isActive" checked={formData.isActive} onCheckedChange={handleSwitchChange} />
                    <Label htmlFor="isActive">Aktif</Label>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex gap-2">
                      <AlertCircle className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      <div className="text-sm text-gray-700">
                        <p className="font-medium mb-1">Önizleme</p>
                        <div
                          className="p-2 rounded"
                          style={{
                            backgroundColor: formData.backgroundColor,
                            color: formData.textColor,
                          }}
                        >
                          {formData.content || "Duyuru içeriği burada görüntülenecek"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    {isEditing && (
                      <Button type="button" variant="outline" onClick={resetForm}>
                        İptal
                      </Button>
                    )}
                    <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                      {isEditing ? "Güncelle" : "Ekle"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
