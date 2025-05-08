"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useAuth } from "@/hooks/use-auth"
import {
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
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
  RefreshCw,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface User {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
  avatar_url?: string
}

export default function UsersPage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "user",
    fullName: "",
    phone: "",
  })
  const [fetchError, setFetchError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkAdminAndFetchUsers = async () => {
      if (!authLoading) {
        if (!user) {
          router.push("/auth/login?returnTo=/admin/users")
          return
        } else if (user.role !== "admin") {
          router.push("/")
          return
        }
      } else {
        return
      }

      await fetchUsers()
    }

    checkAdminAndFetchUsers()
  }, [user, authLoading])

  const fetchUsers = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      console.log("Kullanıcılar getiriliyor...")

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (profilesError) {
        throw profilesError
      }

      setUsers(
        profilesData.map((profile) => ({
          ...profile,
          email: profile.email || "E-posta profilden alınamadı",
        })),
      )
    } catch (error: any) {
      console.error("Kullanıcılar yüklenirken hata:", error)
      setFetchError(error.message || "Kullanıcılar yüklenirken bir hata oluştu.")
      toast({
        title: "Hata",
        description: "Kullanıcılar yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value })
  }

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      role: "user",
      fullName: "",
      phone: "",
    })
  }

  const handleAddUser = async () => {
    try {
      const { email, password, role, fullName, phone } = formData

      if (!email || !password) {
        toast({
          title: "Hata",
          description: "Email ve şifre alanları zorunludur.",
          variant: "destructive",
        })
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            full_name: fullName,
          },
        },
      })

      if (authError) throw authError

      const { error: userError } = await supabase.from("profiles").insert({
        id: authData.user?.id,
        email: email,
        role,
        full_name: fullName,
        phone,
      })

      if (userError) throw userError

      toast({
        title: "Başarılı",
        description: "Kullanıcı başarıyla eklendi.",
      })

      resetForm()
      setIsAddDialogOpen(false)

      fetchUsers()
    } catch (error: any) {
      console.error("Kullanıcı eklenirken hata:", error)
      toast({
        title: "Hata",
        description: error.message || "Kullanıcı eklenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleEditUser = (user: any) => {
    setSelectedUser(user)
    setFormData({
      email: user.email,
      password: "",
      role: user.role,
      fullName: user.full_name || "",
      phone: user.phone || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateUser = async () => {
    try {
      const { email, password, role, fullName, phone } = formData

      if (!email) {
        toast({
          title: "Hata",
          description: "Email alanı zorunludur.",
          variant: "destructive",
        })
        return
      }

      const { error: userError } = await supabase
        .from("profiles")
        .update({
          email,
          role,
          full_name: fullName,
          phone,
        })
        .eq("id", selectedUser.id)

      if (userError) throw userError

      if (password) {
        const response = await fetch(`/api/admin/update-user-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: selectedUser.id,
            password,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Şifre güncellenirken bir hata oluştu")
        }
      }

      toast({
        title: "Başarılı",
        description: "Kullanıcı başarıyla güncellendi.",
      })

      resetForm()
      setIsEditDialogOpen(false)

      fetchUsers()
    } catch (error: any) {
      console.error("Kullanıcı güncellenirken hata:", error)
      toast({
        title: "Hata",
        description: error.message || "Kullanıcı güncellenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (id: string) => {
    try {
      if (!window.confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) {
        return
      }

      const { error } = await supabase.from("profiles").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Başarılı",
        description: "Kullanıcı başarıyla silindi.",
      })

      fetchUsers()
    } catch (error: any) {
      console.error("Kullanıcı silinirken hata:", error)
      toast({
        title: "Hata",
        description: error.message || "Kullanıcı silinirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", id)

      if (error) throw error

      toast({
        title: "Başarılı",
        description: `Kullanıcı rolü ${newRole} olarak güncellendi.`,
      })

      fetchUsers()
    } catch (error: any) {
      console.error("Rol değiştirirken hata:", error)
      toast({
        title: "Hata",
        description: error.message || "Rol değiştirirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Yükleniyor...</p>
      </div>
    )
  }

  if (!user || user.role !== "admin") {
    return null
  }

  const sidebarItems = [
    { icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard", href: "/admin/dashboard" },
    { icon: <Users className="h-5 w-5" />, label: "Kullanıcılar", href: "/admin/users" },
    { icon: <Store className="h-5 w-5" />, label: "Mağazalar", href: "/admin/stores" },
    { icon: <ShoppingBag className="h-5 w-5" />, label: "Ürünler", href: "/admin/products" },
    { icon: <Tag className="h-5 w-5" />, label: "Kategoriler", href: "/admin/categories" },
    { icon: <Bell className="h-5 w-5" />, label: "Duyurular", href: "/admin/panel/duyurular" },
    { icon: <AlertCircle className="h-5 w-5" />, label: "Satıcı Başvuruları", href: "/admin/panel/satici-basvurulari" },
    { icon: <FileText className="h-5 w-5" />, label: "Siparişler", href: "/admin/orders" },
    { icon: <Database className="h-5 w-5" />, label: "Veritabanı", href: "/admin/database" },
    { icon: <Settings className="h-5 w-5" />, label: "Ayarlar", href: "/admin/settings" },
  ]

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <div className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-2 space-y-1">
            {sidebarItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                  router.pathname === item.href
                    ? "bg-gray-100 dark:bg-gray-700 text-primary"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => signOut()}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Çıkış Yap
          </Button>
        </div>
      </div>

      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <div className="p-4 border-b flex items-center justify-between">
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="px-2 space-y-1">
              {sidebarItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                    router.pathname === item.href
                      ? "bg-gray-100 dark:bg-gray-700 text-primary"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                </a>
              ))}
            </nav>
          </div>
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                signOut()
                setIsMobileMenuOpen(false)
              }}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Çıkış Yap
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden bg-white dark:bg-gray-800 border-b p-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Kullanıcılar</h1>
          <div className="w-6"></div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto">
            {fetchError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Hata</AlertTitle>
                <AlertDescription>{fetchError}</AlertDescription>
                <Button variant="outline" size="sm" className="mt-2" onClick={fetchUsers}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Yeniden Dene
                </Button>
              </Alert>
            )}

            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Kullanıcı Yönetimi</h1>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Yeni Kullanıcı
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
                    <DialogDescription>Yeni bir kullanıcı eklemek için aşağıdaki formu doldurun.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">
                        Email
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="password" className="text-right">
                        Şifre
                      </Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="fullName" className="text-right">
                        Ad Soyad
                      </Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="phone" className="text-right">
                        Telefon
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="role" className="text-right">
                        Rol
                      </Label>
                      <Select value={formData.role} onValueChange={(value) => handleSelectChange("role", value)}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Rol seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Kullanıcı</SelectItem>
                          <SelectItem value="seller">Satıcı</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      İptal
                    </Button>
                    <Button onClick={handleAddUser}>Ekle</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Kullanıcılar</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>İsim</TableHead>
                      <TableHead>E-posta</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Oluşturulma Tarihi</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono text-xs">{user.id.substring(0, 8)}...</TableCell>
                        <TableCell>{user.full_name || "İsimsiz"}</TableCell>
                        <TableCell>{user.email || "E-posta mevcut değil"}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              user.role === "admin"
                                ? "bg-red-500"
                                : user.role === "seller"
                                  ? "bg-blue-500"
                                  : "bg-gray-500"
                            }
                          >
                            {user.role === "admin" ? "Admin" : user.role === "seller" ? "Satıcı" : "Kullanıcı"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString("tr-TR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Menüyü aç</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleRoleChange(user.id, user.role === "admin" ? "user" : "admin")}
                              >
                                {user.role === "admin" ? "Admin Yetkisini Kaldır" : "Admin Yap"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteUser(user.id)}>
                                Kullanıcıyı Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
            <DialogDescription>Kullanıcı bilgilerini düzenlemek için aşağıdaki formu kullanın.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">
                Email
              </Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-password" className="text-right">
                Şifre
              </Label>
              <Input
                id="edit-password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="Değiştirmek için yeni şifre girin"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-fullName" className="text-right">
                Ad Soyad
              </Label>
              <Input
                id="edit-fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-phone" className="text-right">
                Telefon
              </Label>
              <Input
                id="edit-phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">
                Rol
              </Label>
              <Select value={formData.role} onValueChange={(value) => handleSelectChange("role", value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Rol seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Kullanıcı</SelectItem>
                  <SelectItem value="seller">Satıcı</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleUpdateUser}>Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
