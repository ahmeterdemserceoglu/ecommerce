"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { debounce } from "lodash" // Using lodash debounce for search input
import { cn } from "@/lib/utils"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import AdminLayout from "@/components/admin/AdminLayout"

interface UserProfile {
  id: string
  full_name?: string | null
  email?: string | null
  role?: "admin" | "seller" | "user" | null
  avatar_url?: string | null
  created_at?: string | null
  store_id?: string | null
  is_active?: boolean | null // Yeni alan
  store?: { // Yeni alan (nested object)
    id: string;
    name: string;
  } | null
}

export default function UsersPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading: authLoading, signOut } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "", // Only for adding users
    role: "user",
    fullName: "",
    phone: "",
    is_active: true, // Default for editing
  })
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const itemsPerPage = 15 // Or get from config/state

  // Filtering and Searching state
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("") // "", "user", "seller", "admin"

  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const fetchUsers = useCallback(async (page = 1, limit = 15, search = searchTerm, role = roleFilter) => {
    console.log(`Fetching users: /api/admin/users?page=${page}&limit=${limit}&searchTerm=${search}&roleFilter=${role}`);
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/users?page=${page}&limit=${limit}&searchTerm=${encodeURIComponent(search)}&roleFilter=${encodeURIComponent(role)}`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.currentPage || 1);
      setTotalUsers(data.totalUsers || 0); // Toplam kullanıcı state'ini güncelle

    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({ title: "Hata", description: `Kullanıcılar getirilirken hata oluştu: ${error.message}`, variant: "destructive" });
      // Handle specific errors like 401/403 if needed
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter, toast]); // debounce kaldırıldı, direkt useCallback

  // Debounced search handler
  const debouncedFetchUsers = useMemo(() => debounce((page = 1, limit = 15, search = "", role = "") => {
    fetchUsers(page, limit, search, role);
  }, 500), [fetchUsers]); // fetchUsers bağımlılığını ekleyelim (ama fetchUsers useCallback içinde olmalı)

  // Initial fetch and dependency changes effect
  useEffect(() => {
    if (hasMounted && user && user.role === "admin") { // isAdmin kontrolü eklendi
      debouncedFetchUsers(currentPage, 15, searchTerm, roleFilter);
    }
  }, [currentPage, searchTerm, roleFilter, hasMounted, user, debouncedFetchUsers]); // Bağımlılıklara eklendi

  // Admin check effect
  useEffect(() => {
    if (hasMounted) { // Only run after component has mounted
      console.log("[Admin Check Effect] Auth Loading:", authLoading, "User:", user);
      if (!authLoading) {
        if (!user) {
          console.log("[Admin Check Effect] No user found after auth loading. Redirecting to login.");
          toast({ title: "Oturum Gerekli", description: "Lütfen giriş yapın.", variant: "destructive" });
          router.push("/auth/login"); // Or your login page
        } else if (user.role !== "admin") {
          console.log(`[Admin Check Effect] User is not admin. User role: ${user.role}. Redirecting.`);
          toast({ title: "Yetkisiz Erişim", description: "Bu sayfaya erişim için admin yetkisi gereklidir.", variant: "destructive" });
          router.push("/");
        } else {
          console.log("[Admin Check Effect] User is admin. Access granted.");
        }
      }
    }
  }, [user, authLoading, router, toast, hasMounted]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const resetAddForm = () => {
    setFormData({
      email: "",
      password: "",
      role: "user",
      fullName: "",
      phone: "",
      is_active: true, // Default value doesn't apply to add form
    })
  }

  const resetEditForm = (userToEdit: UserProfile) => {
    setFormData({
      email: userToEdit.email || "",
      password: "", // Password is not edited here
      role: userToEdit.role || "user",
      fullName: userToEdit.full_name || "",
      phone: userToEdit.phone || "",
      is_active: userToEdit.is_active !== null && userToEdit.is_active !== undefined ? userToEdit.is_active : true,
    })
  }

  const handleAddUser = async () => {
    setIsSubmitting(true)
    setFetchError(null)
    try {
      const { email, password, role, fullName, phone } = formData

      if (!email || !password) {
        toast({
          title: "Missing Fields",
          description: "Email and password are required to add a user.",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role, full_name: fullName, phone }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Failed to add user (${response.status})`)
      }

      toast({
        title: "Success",
        description: `User ${result.email} added successfully.`,
      })

      resetAddForm()
      setIsAddDialogOpen(false)
      fetchUsers(currentPage, searchTerm, roleFilter) // Refresh current page
    } catch (error: any) {
      console.error("Error adding user:", error)
      toast({
        title: "Error Adding User",
        description: error.message || "Could not add the user.",
        variant: "destructive",
      })
      setFetchError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditUserClick = (userToEdit: UserProfile) => {
    setSelectedUser(userToEdit)
    resetEditForm(userToEdit);
    setIsEditDialogOpen(true)
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true)
    setFetchError(null)
    try {
      // Only send fields that are part of the update schema
      const { email, role, fullName, phone, is_active } = formData;
      const updatePayload: any = {};
      if (email && email !== selectedUser.email) updatePayload.email = email;
      if (role && role !== selectedUser.role) updatePayload.role = role;
      if (fullName !== (selectedUser.full_name || "")) updatePayload.full_name = fullName;
      if (phone !== (selectedUser.phone || "")) updatePayload.phone = phone;
      if (is_active !== selectedUser.is_active) updatePayload.is_active = is_active;

      if (Object.keys(updatePayload).length === 0) {
        toast({ title: "No Changes", description: "No changes detected to update." });
        setIsEditDialogOpen(false);
        setIsSubmitting(false);
        return;
      }

      console.log("Updating user:", selectedUser.id, "Payload:", updatePayload);

      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      })

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to update user (${response.status})`)
      }

      toast({
        title: "Success",
        description: `User ${result.email} updated successfully.`,
      })

      // Update user in local state for immediate feedback
      setUsers(prevUsers =>
        prevUsers.map(u => u.id === selectedUser.id ? { ...u, ...result } : u)
      );

      setIsEditDialogOpen(false)
      setSelectedUser(null)
    } catch (error: any) {
      console.error("Error updating user:", error)
      toast({
        title: "Error Updating User",
        description: error.message || "Could not update the user.",
        variant: "destructive",
      })
      setFetchError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDeleteUser = async (id: string, email: string) => {
    setIsSubmitting(true); // Use isSubmitting to disable delete button in dialog
    setFetchError(null);
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Failed to delete user (${response.status})`)
      }

      toast({
        title: "Success",
        description: `User ${email} deleted successfully. Note: Auth user might still exist if admin client wasn't used.`,
      })

      // Remove user from local state
      setUsers(prevUsers => prevUsers.filter(u => u.id !== id));
      setTotalUsers(prev => prev - 1);
      // Adjust total pages if needed, or refetch
      if (users.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1); // Go to previous page if last item on current page deleted
      } else {
        // Optional: fetchUsers(currentPage) to ensure counts are accurate if not adjusting locally
      }

    } catch (error: any) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error Deleting User",
        description: error.message || "Could not delete the user.",
        variant: "destructive",
      })
      setFetchError(error.message);
    } finally {
      setIsSubmitting(false); // Re-enable buttons
    }
  }

  // Update search term state and trigger debounced fetch
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = event.target.value;
    setSearchTerm(newSearchTerm);
    setCurrentPage(1); // Sayfayı başa al
    // debouncedFetchUsers(1, 15, newSearchTerm, roleFilter); // debounce kullanılıyorsa bu satır fetchUsers'ı tetikler
  };

  // Update role filter state and trigger fetch
  const handleRoleFilterChange = (value: string) => {
    const newRoleFilter = value === "ALL_ROLES" ? "" : value;
    setRoleFilter(newRoleFilter);
    setCurrentPage(1); // Sayfayı başa al
    // debouncedFetchUsers(1, 15, searchTerm, newRoleFilter); // debounce kullanılıyorsa bu satır fetchUsers'ı tetikler
  };

  // Loading and Auth Check
  if (!hasMounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // This state implies auth has loaded, but no user is authenticated.
    // The admin check useEffect should handle redirection.
    // Showing a loader here prevents flashing content before redirect.
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Ensure user is admin (secondary check after useEffect for redirection)
  if (user.role !== "admin") {
    // Redirect handled by useEffect, this is a fallback render state
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Yetkisiz erişim.</p>
      </div>
    )
  }

  return (
    <AdminLayout>
      {/* --- Main Content --- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-gray-800 border-b p-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Kullanıcılar</h1>
          <div className="w-6"></div> {/* Spacer */}
        </div>
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto">
            {/* Error Alert */}
            {fetchError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Hata</AlertTitle>
                <AlertDescription>{fetchError}</AlertDescription>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => fetchUsers(currentPage, searchTerm, roleFilter)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Yeniden Dene
                </Button>
              </Alert>
            )}
            {/* Page Header & Add Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
              <h1 className="text-2xl font-bold">Kullanıcı Yönetimi</h1>
              {/* Add User Dialog Trigger */}
              <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetAddForm(); }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Yeni Kullanıcı
                  </Button>
                </DialogTrigger>
                {/* Add User Dialog Content */}
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
                    <DialogDescription>Yeni bir kullanıcı ve profil oluştur.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    {/* Add Form Fields */}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="add-email" className="text-right">Email*</Label>
                      <Input id="add-email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="add-password" className="text-right">Şifre*</Label>
                      <Input id="add-password" name="password" type="password" value={formData.password} onChange={handleInputChange} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="add-fullName" className="text-right">Ad Soyad</Label>
                      <Input id="add-fullName" name="fullName" value={formData.fullName} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="add-phone" className="text-right">Telefon</Label>
                      <Input id="add-phone" name="phone" value={formData.phone} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="add-role" className="text-right">Rol</Label>
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
                    {/* Add more fields if needed based on schema */}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>İptal</Button>
                    <Button onClick={handleAddUser} disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Ekle
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {/* Filter and Search Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="İsim veya e-posta ara..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter === "" ? "ALL_ROLES" : roleFilter} onValueChange={handleRoleFilterChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Role Göre Filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_ROLES">Tüm Roller</SelectItem>
                  <SelectItem value="user">Kullanıcı</SelectItem>
                  <SelectItem value="seller">Satıcı</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Users Table Card */}
            <Card>
              <CardHeader>
                <CardTitle>Kullanıcı Listesi</CardTitle>
                <CardDescription>Toplam {totalUsers} kullanıcı bulundu.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">Filtrelerle eşleşen kullanıcı bulunamadı.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {/* <TableHead>ID</TableHead> */}
                          <TableHead>İsim</TableHead>
                          <TableHead>E-posta</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead>Telefon</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead>Mağaza</TableHead>
                          <TableHead>Kayıt Tarihi</TableHead>
                          <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u.id}>
                            {/* <TableCell className="font-mono text-xs">{u.id.substring(0, 8)}...</TableCell> */}
                            <TableCell>{u.full_name || "-"}</TableCell>
                            <TableCell>{u.email || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={u.role === "admin" ? "destructive" : u.role === "seller" ? "default" : "secondary"}
                                className="capitalize"
                              >
                                {u.role}
                              </Badge>
                            </TableCell>
                            <TableCell>{u.phone || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={u.is_active ? "success" : "outline"}>
                                {u.is_active ? "Aktif" : "Pasif"}
                              </Badge>
                            </TableCell>
                            <TableCell>{u.store?.name || "-"}</TableCell>
                            <TableCell>
                              {new Date(u.created_at).toLocaleDateString("tr-TR")}
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
                                  <DropdownMenuItem onClick={() => handleEditUserClick(u)}>
                                    Düzenle
                                  </DropdownMenuItem>
                                  {/* Delete Trigger */}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      {/* Prevent dropdown closing on trigger click */}
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                        Sil
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    {/* Delete Confirmation Dialog */}
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          '{u.email}' kullanıcısını silmek üzeresiniz. Bu işlem geri alınamaz.
                                          Kullanıcının profili silinecektir (Auth kullanıcısı silme işlemi için admin client gereklidir).
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel disabled={isSubmitting}>İptal</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteUser(u.id, u.email)}
                                          className="bg-red-600 hover:bg-red-700"
                                          disabled={isSubmitting}
                                        >
                                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                          Evet, Sil
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <CardFooter className="flex justify-between items-center border-t pt-4">
                  <span className="text-sm text-muted-foreground">
                    Sayfa {currentPage} / {totalPages} ({totalUsers} kullanıcı)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      disabled={currentPage <= 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Önceki
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={currentPage >= totalPages || loading}
                    >
                      Sonraki <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>
        </main>
      </div>
      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setSelectedUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
            <DialogDescription>Kullanıcı profil bilgilerini ve rolünü düzenle.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              {/* Edit Form Fields */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">Email</Label>
                {/* Email update needs admin client usually, make read-only or add warning */}
                <Input id="edit-email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="col-span-3" title="Email değiştirmek için admin client gerekir." readOnly />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-fullName" className="text-right">Ad Soyad</Label>
                <Input id="edit-fullName" name="fullName" value={formData.fullName} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-phone" className="text-right">Telefon</Label>
                <Input id="edit-phone" name="phone" value={formData.phone} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">Rol</Label>
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-is_active" className="text-right">Aktif</Label>
                <div className="col-span-3 flex items-center">
                  <input
                    type="checkbox"
                    id="edit-is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleSwitchChange("is_active", e.target.checked)}
                    className="mr-2 h-4 w-4"
                  />
                  <span className="text-sm text-muted-foreground">Hesap aktif mi?</span>
                </div>
              </div>
              {/* Add other editable fields based on adminUserUpdateSchema */}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>İptal</Button>
            <Button onClick={handleUpdateUser} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
