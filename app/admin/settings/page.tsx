"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useAuth } from "@/hooks/use-auth"
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Store,
  Tag,
  Users,
  X,
  FileText,
  Database,
  Bell,
  AlertCircle,
  ShoppingBag,
  AlertOctagon,
  RefreshCw,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import AdminLayout from "@/components/admin/AdminLayout"

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [needsDatabaseUpdate, setNeedsDatabaseUpdate] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [settings, setSettings] = useState({
    siteName: "E-Commerce Marketplace",
    siteDescription: "Türkiye'nin en büyük online alışveriş platformu",
    contactEmail: "info@ecommerce.com",
    contactPhone: "+90 212 123 4567",
    address: "İstanbul, Türkiye",
    maintenanceMode: false,
    allowRegistrations: true,
    allowSellerApplications: true,
    commissionRate: 5,
    minOrderAmount: 50,
    maxProductsPerStore: 1000,
    featuredStoreLimit: 10,
    featuredProductLimit: 20,
    homepageCategoryLimit: 6,
  })
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Check if user is admin
    if (!authLoading && user) {
      if (user.role !== "admin") {
        router.push("/")
        return
      }
    } else if (!authLoading && !user) {
      router.push("/auth/login?returnTo=/admin/settings")
      return
    }

    const createSettingsTable = async () => {
      try {
        console.log("Attempting to create settings table...")
        const response = await fetch("/api/admin/create-settings-table", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })

        const result = await response.json()
        if (!result.success) {
          console.error("Error from create-settings-table API:", result.error)
          setNeedsDatabaseUpdate(true)
          return false
        } else {
          console.log("Settings table created via API:", result)
          return true
        }
      } catch (apiError) {
        console.error("Error calling create-settings-table API:", apiError)
        setNeedsDatabaseUpdate(true)
        return false
      }
    }

    const fetchSettings = async () => {
      setLoading(true)
      try {
        console.log("Checking if settings table exists...")

        // First try to create the table directly - this is the most reliable approach
        const tableCreated = await createSettingsTable()
        console.log("Table creation attempt result:", tableCreated)

        // Now try to fetch settings
        console.log("Fetching settings...")
        const { data, error } = await supabase.from("settings").select("*").maybeSingle()

        if (error) {
          if (error.code === "PGRST116") {
            // No rows returned, which is fine for initial setup
            console.log("No settings found, using defaults")
          } else {
            console.error("Error fetching settings:", error)
            throw error
          }
        }

        if (data) {
          console.log("Settings loaded:", data)
          setSettings({
            siteName: data.site_name || "E-Commerce Marketplace",
            siteDescription: data.site_description || "Türkiye'nin en büyük online alışveriş platformu",
            contactEmail: data.contact_email || "info@ecommerce.com",
            contactPhone: data.contact_phone || "+90 212 123 4567",
            address: data.address || "İstanbul, Türkiye",
            maintenanceMode: data.maintenance_mode === true,
            allowRegistrations: data.allow_registrations !== false,
            allowSellerApplications: data.allow_seller_applications !== false,
            commissionRate: data.commission_rate || 5,
            minOrderAmount: data.min_order_amount || 50,
            maxProductsPerStore: data.max_products_per_store || 1000,
            featuredStoreLimit: data.featured_store_limit || 10,
            featuredProductLimit: data.featured_product_limit || 20,
            homepageCategoryLimit: data.homepage_category_limit || 6,
          })
        }
      } catch (error) {
        console.error("Error in fetchSettings:", error)
        toast({
          title: "Hata",
          description: "Ayarlar yüklenirken bir hata oluştu. Veritabanı yapılandırması gerekli olabilir.",
          variant: "destructive",
        })
        setNeedsDatabaseUpdate(true)
      } finally {
        setLoading(false)
      }
    }

    if (user && user.role === "admin") {
      fetchSettings()
    }
  }, [user, authLoading, router, supabase, toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSettings({ ...settings, [name]: value })
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setSettings({ ...settings, [name]: checked })
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setSettings({ ...settings, [name]: Number.parseFloat(value) })
  }

  const handleSaveSettings = async () => {
    try {
      // First ensure the table exists
      await fetch("/api/admin/create-settings-table", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      // Check if settings already exist
      const { data, error: fetchError } = await supabase.from("settings").select("id").maybeSingle()

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError
      }

      const settingsData = {
        site_name: settings.siteName,
        site_description: settings.siteDescription,
        contact_email: settings.contactEmail,
        contact_phone: settings.contactPhone,
        address: settings.address,
        maintenance_mode: settings.maintenanceMode,
        allow_registrations: settings.allowRegistrations,
        allow_seller_applications: settings.allowSellerApplications,
        commission_rate: settings.commissionRate,
        min_order_amount: settings.minOrderAmount,
        max_products_per_store: settings.maxProductsPerStore,
        featured_store_limit: settings.featuredStoreLimit,
        featured_product_limit: settings.featuredProductLimit,
        homepage_category_limit: settings.homepageCategoryLimit,
        updated_at: new Date().toISOString(),
      }

      if (data) {
        // Update existing settings
        const { error } = await supabase.from("settings").update(settingsData).eq("id", data.id)
        if (error) throw error
      } else {
        // Insert new settings
        const { error } = await supabase.from("settings").insert(settingsData)
        if (error) throw error
      }

      toast({
        title: "Başarılı",
        description: "Ayarlar başarıyla kaydedildi.",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Hata",
        description: "Ayarlar kaydedilirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const updateDatabaseFunctions = async () => {
    setIsUpdating(true)
    try {
      // First run the setup SQL directly
      const response = await fetch("/api/admin/run-setup-sql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Başarılı",
          description: "Veritabanı fonksiyonları başarıyla oluşturuldu.",
        })
        // Refresh the page to show updated data
        window.location.reload()
      } else {
        console.error("Database function update error:", result.error)
        toast({
          title: "Hata",
          description: `Veritabanı fonksiyonları oluşturulurken bir hata oluştu: ${result.error || "Bilinmeyen hata"}`,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error updating database functions:", error)
      toast({
        title: "Hata",
        description: `Veritabanı fonksiyonları oluşturulurken bir hata oluştu: ${error.message || "Bilinmeyen hata"}`,
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <p>Yükleniyor...</p>
        </div>
      </AdminLayout>
    )
  }

  if (!user || user.role !== "admin") {
    return null
  }

  return (
    <AdminLayout>
      {/* --- Main Content --- */}
      <div className="container py-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Site Ayarları</h1>
            <div className="flex gap-2">
              <Button onClick={handleSaveSettings}>Ayarları Kaydet</Button>
              {needsDatabaseUpdate && (
                <Button onClick={updateDatabaseFunctions} variant="outline" disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Güncelleniyor...
                    </>
                  ) : (
                    "Veritabanı Fonksiyonlarını Oluştur"
                  )}
                </Button>
              )}
            </div>
          </div>

          {needsDatabaseUpdate && (
            <Alert variant="destructive" className="mb-4">
              <AlertOctagon className="h-4 w-4" />
              <AlertTitle>Veritabanı Güncellemesi Gerekli</AlertTitle>
              <AlertDescription>
                Veritabanı fonksiyonları eksik. Ayarları düzgün şekilde kullanmak için "Veritabanı Fonksiyonlarını
                Oluştur" butonuna tıklayın.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="general">
            <TabsList className="mb-4">
              <TabsTrigger value="general">Genel</TabsTrigger>
              <TabsTrigger value="contact">İletişim</TabsTrigger>
              <TabsTrigger value="commerce">Ticaret</TabsTrigger>
              <TabsTrigger value="display">Görünüm</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Genel Ayarlar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="siteName">Site Adı</Label>
                      <Input id="siteName" name="siteName" value={settings.siteName} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="siteDescription">Site Açıklaması</Label>
                      <Textarea
                        id="siteDescription"
                        name="siteDescription"
                        value={settings.siteDescription}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="maintenanceMode">Bakım Modu</Label>
                      <Switch
                        id="maintenanceMode"
                        checked={settings.maintenanceMode}
                        onCheckedChange={(checked) => handleSwitchChange("maintenanceMode", checked)}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Bakım modu etkinleştirildiğinde, site sadece yöneticiler tarafından görüntülenebilir.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="allowRegistrations">Kayıtlara İzin Ver</Label>
                      <Switch
                        id="allowRegistrations"
                        checked={settings.allowRegistrations}
                        onCheckedChange={(checked) => handleSwitchChange("allowRegistrations", checked)}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Devre dışı bırakıldığında, yeni kullanıcı kayıtları kabul edilmez.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="allowSellerApplications">Satıcı Başvurularına İzin Ver</Label>
                      <Switch
                        id="allowSellerApplications"
                        checked={settings.allowSellerApplications}
                        onCheckedChange={(checked) => handleSwitchChange("allowSellerApplications", checked)}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Devre dışı bırakıldığında, yeni satıcı başvuruları kabul edilmez.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact">
              <Card>
                <CardHeader>
                  <CardTitle>İletişim Bilgileri</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">İletişim Email</Label>
                      <Input
                        id="contactEmail"
                        name="contactEmail"
                        type="email"
                        value={settings.contactEmail}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">İletişim Telefon</Label>
                      <Input
                        id="contactPhone"
                        name="contactPhone"
                        value={settings.contactPhone}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Adres</Label>
                    <Textarea id="address" name="address" value={settings.address} onChange={handleInputChange} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commerce">
              <Card>
                <CardHeader>
                  <CardTitle>Ticaret Ayarları</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="commissionRate">Komisyon Oranı (%)</Label>
                      <Input
                        id="commissionRate"
                        name="commissionRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={settings.commissionRate}
                        onChange={handleNumberChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minOrderAmount">Minimum Sipariş Tutarı (₺)</Label>
                      <Input
                        id="minOrderAmount"
                        name="minOrderAmount"
                        type="number"
                        min="0"
                        step="1"
                        value={settings.minOrderAmount}
                        onChange={handleNumberChange}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxProductsPerStore">Mağaza Başına Maksimum Ürün</Label>
                    <Input
                      id="maxProductsPerStore"
                      name="maxProductsPerStore"
                      type="number"
                      min="1"
                      step="1"
                      value={settings.maxProductsPerStore}
                      onChange={handleNumberChange}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="display">
              <Card>
                <CardHeader>
                  <CardTitle>Görünüm Ayarları</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="featuredStoreLimit">Öne Çıkan Mağaza Limiti</Label>
                      <Input
                        id="featuredStoreLimit"
                        name="featuredStoreLimit"
                        type="number"
                        min="0"
                        step="1"
                        value={settings.featuredStoreLimit}
                        onChange={handleNumberChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="featuredProductLimit">Öne Çıkan Ürün Limiti</Label>
                      <Input
                        id="featuredProductLimit"
                        name="featuredProductLimit"
                        type="number"
                        min="0"
                        step="1"
                        value={settings.featuredProductLimit}
                        onChange={handleNumberChange}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="homepageCategoryLimit">Ana Sayfa Kategori Limiti</Label>
                    <Input
                      id="homepageCategoryLimit"
                      name="homepageCategoryLimit"
                      type="number"
                      min="0"
                      step="1"
                      value={settings.homepageCategoryLimit}
                      onChange={handleNumberChange}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminLayout>
  )
}
