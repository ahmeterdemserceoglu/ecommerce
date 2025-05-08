"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Settings,
  Store,
  Tag,
  Trash,
  Users,
  X,
  Edit,
  FileText,
  Database,
  Bell,
  AlertCircle,
  ShoppingBag,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function CategoriesPage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<any[]>([])
  const [parentCategories, setParentCategories] = useState<any[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    parentId: "",
    icon: "",
    sortOrder: 0,
    isActive: true,
  })
  const supabase = createClientComponentClient()

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
            router.push("/auth/login?returnTo=/admin/categories")
          }
        } catch (err) {
          console.error("Session refresh failed:", err)
          router.push("/auth/login?returnTo=/admin/categories")
        }
        return
      }

      const fetchCategories = async () => {
        setLoading(true)
        try {
          // Fetch all categories
          const { data, error } = await supabase
            .from("categories")
            .select(`
              id, name, slug, description, parent_id, icon, 
              sort_order, is_active, created_at,
              parent:parent_id(name)
            `)
            .order("sort_order", { ascending: true })

          if (error) throw error

          setCategories(data || [])

          // Fetch parent categories for dropdown
          const { data: parentData, error: parentError } = await supabase
            .from("categories")
            .select("id, name")
            .is("parent_id", null)
            .order("name", { ascending: true })

          if (parentError) throw parentError

          setParentCategories(parentData || [])
        } catch (error) {
          console.error("Error fetching categories:", error)
          toast({
            title: "Hata",
            description: "Kategoriler yüklenirken bir hata oluştu.",
            variant: "destructive",
          })
        } finally {
          setLoading(false)
        }
      }

      if (user && user.role === "admin") {
        fetchCategories()
      }
    }

    checkAdminAuth()
  }, [user, authLoading, router, supabase, toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    // Auto-generate slug from name if slug field is empty
    if (name === "name" && !formData.slug) {
      const slug = value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
      setFormData({ ...formData, slug })
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value })
  }

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      parentId: "",
      icon: "",
      sortOrder: 0,
      isActive: true,
    })
  }

  const handleAddCategory = async () => {
    try {
      const { name, slug, description, parentId, icon, sortOrder, isActive } = formData

      if (!name || !slug) {
        toast({
          title: "Hata",
          description: "Kategori adı ve slug alanları zorunludur.",
          variant: "destructive",
        })
        return
      }

      // If parentId is "0" or empty, set it to null
      const parent_id = parentId === "0" || !parentId ? null : parentId

      const { data, error } = await supabase
        .from("categories")
        .insert({
          name,
          slug,
          description,
          parent_id,
          icon: icon || null,
          sort_order: sortOrder,
          is_active: isActive,
        })
        .select()

      if (error) throw error

      toast({
        title: "Başarılı",
        description: "Kategori başarıyla eklendi.",
      })

      // Refresh categories
      const { data: newCategories, error: fetchError } = await supabase
        .from("categories")
        .select(`
          id, name, slug, description, parent_id, icon, 
          sort_order, is_active, created_at,
          parent:parent_id(name)
        `)
        .order("sort_order", { ascending: true })

      if (fetchError) throw fetchError

      setCategories(newCategories || [])
      resetForm()
      setIsAddDialogOpen(false)
    } catch (error: any) {
      console.error("Error adding category:", error)
      toast({
        title: "Hata",
        description: error.message || "Kategori eklenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleEditCategory = (category: any) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      parentId: category.parent_id || "",
      icon: category.icon || "",
      sortOrder: category.sort_order || 0,
      isActive: category.is_active,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateCategory = async () => {
    try {
      const { name, slug, description, parentId, icon, sortOrder, isActive } = formData

      if (!name || !slug) {
        toast({
          title: "Hata",
          description: "Kategori adı ve slug alanları zorunludur.",
          variant: "destructive",
        })
        return
      }

      // If parentId is "0" or empty, set it to null
      const parent_id = parentId === "0" || !parentId ? null : parentId

      const { error } = await supabase
        .from("categories")
        .update({
          name,
          slug,
          description,
          parent_id,
          icon: icon || null,
          sort_order: sortOrder,
          is_active: isActive,
        })
        .eq("id", selectedCategory.id)

      if (error) throw error

      toast({
        title: "Başarılı",
        description: "Kategori başarıyla güncellendi.",
      })

      // Refresh categories
      const { data: updatedCategories, error: fetchError } = await supabase
        .from("categories")
        .select(`
          id, name, slug, description, parent_id, icon, 
          sort_order, is_active, created_at,
          parent:parent_id(name)
        `)
        .order("sort_order", { ascending: true })

      if (fetchError) throw fetchError

      setCategories(updatedCategories || [])
      resetForm()
      setIsEditDialogOpen(false)
    } catch (error: any) {
      console.error("Error updating category:", error)
      toast({
        title: "Hata",
        description: error.message || "Kategori güncellenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/categories?id=${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Kategori silinirken bir hata oluştu.")
      }

      toast({
        title: "Başarılı",
        description: "Kategori başarıyla silindi.",
      })

      // Refresh categories
      const { data: remainingCategories, error: fetchError } = await supabase
        .from("categories")
        .select(`
          id, name, slug, description, parent_id, icon, 
          sort_order, is_active, created_at,
          parent:parent_id(name)
        `)
        .order("sort_order", { ascending: true })

      if (fetchError) throw fetchError

      setCategories(remainingCategories || [])
    } catch (error: any) {
      console.error("Error deleting category:", error)
      toast({
        title: "Hata",
        description: error.message || "Kategori silinirken bir hata oluştu.",
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
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-2 space-y-1">
            {sidebarItems.map((item) => (
              <Link
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
              </Link>
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

      {/* Mobile Sidebar */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-gray-800 border-b p-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Kategoriler</h1>
          <div className="w-6"></div> {/* Spacer for alignment */}
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Kategori Yönetimi</h1>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Yeni Kategori
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yeni Kategori Ekle</DialogTitle>
                    <DialogDescription>Yeni bir kategori eklemek için aşağıdaki formu doldurun.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Kategori Adı
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="slug" className="text-right">
                        Slug
                      </Label>
                      <Input
                        id="slug"
                        name="slug"
                        value={formData.slug}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="description" className="text-right">
                        Açıklama
                      </Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="parentId" className="text-right">
                        Üst Kategori
                      </Label>
                      <Select
                        value={formData.parentId}
                        onValueChange={(value) => handleSelectChange("parentId", value)}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Üst kategori seçin (opsiyonel)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Ana Kategori</SelectItem>
                          {parentCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="icon" className="text-right">
                        İkon
                      </Label>
                      <Input
                        id="icon"
                        name="icon"
                        value={formData.icon}
                        onChange={handleInputChange}
                        className="col-span-3"
                        placeholder="İkon adı (opsiyonel)"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="sortOrder" className="text-right">
                        Sıralama
                      </Label>
                      <Input
                        id="sortOrder"
                        name="sortOrder"
                        type="number"
                        value={formData.sortOrder}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      İptal
                    </Button>
                    <Button onClick={handleAddCategory}>Ekle</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Kategoriler</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategori Adı</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Üst Kategori</TableHead>
                      <TableHead>Sıralama</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.length > 0 ? (
                      categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>{category.slug}</TableCell>
                          <TableCell>{category.parent?.name || "Ana Kategori"}</TableCell>
                          <TableCell>{category.sort_order}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                category.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}
                            >
                              {category.is_active ? "Aktif" : "Pasif"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleEditCategory(category)}
                                  className="cursor-pointer"
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Düzenle
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                                      <Trash className="mr-2 h-4 w-4" />
                                      Sil
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Kategoriyi Sil</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Bu kategoriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>İptal</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteCategory(category.id)}
                                        className="bg-red-500 hover:bg-red-600"
                                      >
                                        Sil
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          Henüz kategori bulunmuyor.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategori Düzenle</DialogTitle>
            <DialogDescription>Kategori bilgilerini düzenlemek için aşağıdaki formu kullanın.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Kategori Adı
              </Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-slug" className="text-right">
                Slug
              </Label>
              <Input
                id="edit-slug"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Açıklama
              </Label>
              <Textarea
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-parentId" className="text-right">
                Üst Kategori
              </Label>
              <Select value={formData.parentId} onValueChange={(value) => handleSelectChange("parentId", value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Üst kategori seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Ana Kategori</SelectItem>
                  {parentCategories
                    .filter((category) => category.id !== selectedCategory?.id)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-icon" className="text-right">
                İkon
              </Label>
              <Input
                id="edit-icon"
                name="icon"
                value={formData.icon}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="İkon adı (opsiyonel)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-sortOrder" className="text-right">
                Sıralama
              </Label>
              <Input
                id="edit-sortOrder"
                name="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleUpdateCategory}>Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
