"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { AlertCircle, Check, X, Eye, Store, User, Calendar, MapPin, Phone, Mail } from "lucide-react"
import AdminLayout from "@/components/admin/AdminLayout"

export default function SellerApplicationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    // Admin kontrolü
    if (!authLoading && user?.role !== "admin") {
      router.push("/")
      return
    }

    fetchApplications()
  }, [user, authLoading, router])

  const fetchApplications = async () => {
    setLoading(true)
    try {
      // Fetch applications without trying to join with profiles
      const { data, error } = await supabase
        .from("seller_applications")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      // If we have applications, fetch the associated user profiles separately
      if (data && data.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(data.map((app) => app.user_id))]

        // Fetch profiles for these users
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .in("id", userIds)

        if (profilesError) throw profilesError

        // Create a map of user_id to profile data
        const profilesMap = {}
        profilesData?.forEach((profile) => {
          profilesMap[profile.id] = profile
        })

        // Attach profile data to each application
        const applicationsWithProfiles = data.map((app) => ({
          ...app,
          profile: profilesMap[app.user_id] || null,
        }))

        setApplications(applicationsWithProfiles)
      } else {
        setApplications([])
      }
    } catch (error) {
      console.error("Başvurular yüklenirken hata:", error)
      toast({
        title: "Hata",
        description: "Satıcı başvuruları yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Hata analiz fonksiyonu
  function handleSupabaseError(error: any): string {
    if (!error) return "Bilinmeyen bir hata oluştu."
    if (typeof error === "string") return error
    if (error.code === "42501" || error.message?.toLowerCase().includes("permission")) {
      return "Veritabanı erişim izniniz yok. Policy veya RLS ayarlarını kontrol edin."
    }
    if (error.code === "42P01" || error.message?.toLowerCase().includes("does not exist")) {
      return "Tablo veya sütun eksik. İlgili tablo/sütun veritabanında mevcut mu?"
    }
    if (error.code === "42501") {
      return "Yetki hatası: Policy veya RLS (Row Level Security) eksik veya yanlış."
    }
    if (error.code === "PGRST116") {
      return "Policy hatası: İlgili tabloya erişim için bir policy tanımlı değil."
    }
    if (error.code === "28P01" || error.message?.toLowerCase().includes("authentication")) {
      return "Veritabanı bağlantı veya kimlik doğrulama hatası. Anahtarlar ve bağlantı bilgilerini kontrol edin."
    }
    if (error.code === "42522" || error.message?.toLowerCase().includes("column")) {
      return "Sütun hatası: Sorgulanan sütun veritabanında mevcut değil."
    }
    if (error.code === "PGRST301" || error.message?.toLowerCase().includes("row level security")) {
      return "RLS (Row Level Security) aktif ancak uygun policy yok. Policy ekleyin."
    }
    if (error.code === "PGRST108" || error.message?.toLowerCase().includes("jwt")) {
      return "JWT veya kimlik doğrulama hatası. Kullanıcı oturumunu kontrol edin."
    }
    if (error.message?.toLowerCase().includes("timeout")) {
      return "Veritabanı isteği zaman aşımına uğradı. Bağlantı veya ağ sorunlarını kontrol edin."
    }
    // Diğer hata türleri
    return error.message || JSON.stringify(error)
  }

  const handleApprove = async (id: string) => {
    setProcessingId(id)
    try {
      // Başvuruyu bul
      const application = applications.find((app) => app.id === id)
      if (!application) throw new Error("Başvuru bulunamadı")

      // Kullanıcı rolünü güncelle
      const { error: userError } = await supabase
        .from("profiles")
        .update({ role: "seller" })
        .eq("id", application.user_id)

      if (userError) throw userError

      // Mağaza oluştur
      const { error: storeError } = await supabase.from("stores").insert({
        user_id: application.user_id,
        owner_id: application.user_id,
        name: application.store_name,
        slug: application.slug,
        description: application.store_description,
        contact_email: application.contact_email,
        contact_phone: application.contact_phone,
        address: application.address,
        city: application.city,
        country: application.country,
        approved: true,
        is_verified: false,
        is_featured: false,
        approved_at: new Date().toISOString(),
      })

      if (storeError) throw storeError

      // Başvuru durumunu güncelle
      const { error: updateError } = await supabase
        .from("seller_applications")
        .update({ status: "approved" })
        .eq("id", id)

      if (updateError) throw updateError

      toast({
        title: "Başvuru onaylandı",
        description: "Satıcı başvurusu başarıyla onaylandı ve mağaza oluşturuldu.",
      })

      // Listeyi güncelle
      fetchApplications()
    } catch (error: any) {
      const detailedError = handleSupabaseError(error)
      console.error("Başvuru onaylanırken hata:", error, JSON.stringify(error))
      toast({
        title: "Hata",
        description: detailedError,
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: string) => {
    setProcessingId(id)
    try {
      // Ret sebebi için prompt göster
      const reason = window.prompt("Başvuruyu reddetme sebebini girin:", "")

      // Eğer kullanıcı iptal ettiyse işlemi durdur
      if (reason === null) {
        setProcessingId(null)
        return
      }

      const { error } = await supabase
        .from("seller_applications")
        .update({
          status: "rejected",
          admin_notes: reason,
        })
        .eq("id", id)

      if (error) throw error

      toast({
        title: "Başvuru reddedildi",
        description: "Satıcı başvurusu reddedildi.",
      })

      // Listeyi güncelle
      fetchApplications()
    } catch (error: any) {
      console.error("Başvuru reddedilirken hata:", error)
      toast({
        title: "Hata",
        description: error.message || "Başvuru reddedilirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  // Başvuru durumuna göre badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-700">
            Beklemede
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="border-green-500 text-green-700">
            Onaylandı
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="border-red-500 text-red-700">
            Reddedildi
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Tarihi formatla
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="container py-10">
          <h1 className="text-2xl font-bold mb-6">Satıcı Başvuruları</h1>
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
        <h1 className="text-2xl font-bold mb-6">Satıcı Başvuruları</h1>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Bekleyen</TabsTrigger>
            <TabsTrigger value="approved">Onaylanan</TabsTrigger>
            <TabsTrigger value="rejected">Reddedilen</TabsTrigger>
            <TabsTrigger value="all">Tümü</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {applications.filter((app) => app.status === "pending").length > 0 ? (
              <div className="space-y-4">
                {applications
                  .filter((app) => app.status === "pending")
                  .map((application) => (
                    <Card key={application.id}>
                      <CardHeader className="bg-muted/50 py-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{application.store_name}</CardTitle>
                            {getStatusBadge(application.status)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Başvuru Tarihi: {formatDate(application.created_at)}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h3 className="text-sm font-medium mb-2">Mağaza Bilgileri</h3>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Store className="h-4 w-4 text-muted-foreground" />
                                <span>{application.store_name}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p>{application.address}</p>
                                  <p>
                                    {application.city}, {application.country}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium mb-2">İletişim Bilgileri</h3>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>{application.profile?.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{application.contact_email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{application.contact_phone}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mb-4">
                          <h3 className="text-sm font-medium mb-2">Mağaza Açıklaması</h3>
                          <p className="text-sm text-muted-foreground">{application.store_description}</p>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleReject(application.id)}
                            disabled={processingId === application.id}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reddet
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-500 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(application.id)}
                            disabled={processingId === application.id}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Onayla
                          </Button>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Detaylar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Bekleyen başvuru bulunmuyor</h3>
                  <p className="text-muted-foreground text-center">Şu anda bekleyen satıcı başvurusu bulunmuyor.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Diğer tablar için benzer içerikler eklenebilir */}
          <TabsContent value="approved">
            {applications.filter((app) => app.status === "approved").length > 0 ? (
              <div className="space-y-4">
                {applications
                  .filter((app) => app.status === "approved")
                  .map((application) => (
                    <Card key={application.id}>
                      <CardHeader className="bg-muted/50 py-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{application.store_name}</CardTitle>
                            {getStatusBadge(application.status)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Onay Tarihi: {formatDate(application.updated_at)}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{application.profile?.email}</span>
                        </div>
                        <Alert className="border-green-500 text-green-700">
                          <Check className="h-4 w-4" />
                          <AlertTitle>Başvuru Onaylandı</AlertTitle>
                          <AlertDescription>Bu başvuru onaylandı ve mağaza oluşturuldu.</AlertDescription>
                        </Alert>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Onaylanan başvuru bulunmuyor</h3>
                  <p className="text-muted-foreground text-center">Şu anda onaylanan satıcı başvurusu bulunmuyor.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rejected">
            {applications.filter((app) => app.status === "rejected").length > 0 ? (
              <div className="space-y-4">
                {applications
                  .filter((app) => app.status === "rejected")
                  .map((application) => (
                    <Card key={application.id}>
                      <CardHeader className="bg-muted/50 py-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{application.store_name}</CardTitle>
                            {getStatusBadge(application.status)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Ret Tarihi: {formatDate(application.updated_at)}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{application.profile?.email}</span>
                        </div>
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Başvuru Reddedildi</AlertTitle>
                          <AlertDescription>
                            {application.admin_notes ? (
                              <>
                                <strong>Ret sebebi:</strong> {application.admin_notes}
                              </>
                            ) : (
                              "Bu başvuru reddedildi."
                            )}
                          </AlertDescription>
                        </Alert>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Reddedilen başvuru bulunmuyor</h3>
                  <p className="text-muted-foreground text-center">Şu anda reddedilen satıcı başvurusu bulunmuyor.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="all">
            {applications.length > 0 ? (
              <div className="space-y-4">
                {applications.map((application) => (
                  <Card key={application.id}>
                    <CardHeader className="bg-muted/50 py-3">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{application.store_name}</CardTitle>
                          {getStatusBadge(application.status)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Başvuru Tarihi: {formatDate(application.created_at)}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h3 className="text-sm font-medium mb-2">Mağaza Bilgileri</h3>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4 text-muted-foreground" />
                              <span>{application.store_name}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p>{application.address}</p>
                                <p>
                                  {application.city}, {application.country}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium mb-2">İletişim Bilgileri</h3>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{application.profile?.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span>{application.contact_email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{application.contact_phone}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {application.status === "rejected" && application.admin_notes && (
                        <Alert variant="destructive" className="mb-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Ret Sebebi</AlertTitle>
                          <AlertDescription>{application.admin_notes}</AlertDescription>
                        </Alert>
                      )}

                      <div className="mb-4">
                        <h3 className="text-sm font-medium mb-2">Mağaza Açıklaması</h3>
                        <p className="text-sm text-muted-foreground">{application.store_description}</p>
                      </div>

                      {application.status === "pending" && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleReject(application.id)}
                            disabled={processingId === application.id}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reddet
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-500 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(application.id)}
                            disabled={processingId === application.id}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Onayla
                          </Button>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Detaylar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Başvuru bulunmuyor</h3>
                  <p className="text-muted-foreground text-center">Şu anda hiç satıcı başvurusu bulunmuyor.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
