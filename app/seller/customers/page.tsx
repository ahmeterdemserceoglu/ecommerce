"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import SellerSidebar from "@/components/seller/seller-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Users, Search, Menu, X, RefreshCw, Mail, Phone, ShoppingBag, Calendar, DollarSign } from "lucide-react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Customer = {
  id: string
  full_name: string
  email: string
  phone?: string
  total_orders: number
  total_spent: number
  last_order_date?: string
  first_order_date?: string
  average_order_value: number
}

export default function CustomersPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("last_order_date")
  const [sortOrder, setSortOrder] = useState("desc")
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/auth/login?returnTo=/seller/customers")
      return
    }
    if (user.role !== "seller" && user.role !== "admin") {
      router.push("/hesabim")
      return
    }

    fetchCustomers()
  }, [user, authLoading])

  useEffect(() => {
    // Filter and sort customers
    let result = [...customers]

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(
        (customer) =>
          customer.full_name.toLowerCase().includes(search) ||
          customer.email.toLowerCase().includes(search) ||
          (customer.phone && customer.phone.includes(search)),
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      let valueA = a[sortBy as keyof Customer]
      let valueB = b[sortBy as keyof Customer]

      // Handle date strings
      if (sortBy === "last_order_date" || sortBy === "first_order_date") {
        valueA = valueA ? new Date(valueA as string).getTime() : 0
        valueB = valueB ? new Date(valueB as string).getTime() : 0
      }

      // Handle numeric values
      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortOrder === "asc" ? valueA - valueB : valueB - valueA
      }

      // Handle string values
      if (typeof valueA === "string" && typeof valueB === "string") {
        return sortOrder === "asc" ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA)
      }

      return 0
    })

    setFilteredCustomers(result)
  }, [customers, searchTerm, sortBy, sortOrder])

  async function fetchCustomers() {
    setLoading(true)
    setIsRefreshing(true)

    try {
      if (!user || !user.id) {
        throw new Error("Kullanıcı bilgisi alınamadı")
      }

      // Get the store ID for the current seller
      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (storeError) {
        throw storeError
      }

      if (!storeData) {
        throw new Error("Mağaza bulunamadı")
      }

      // Get orders for this store using the admin API
      const ordersResponse = await fetch(`/api/admin/get-store-orders?storeId=${storeData.id}`)
      if (!ordersResponse.ok) {
        const errorData = await ordersResponse.json()
        throw new Error(errorData.error || "Sipariş verileri alınamadı")
      }

      const ordersData = await ordersResponse.json()

      // Group orders by user_id
      const customerOrders: Record<
        string,
        { orders: any[]; total_spent: number; last_order_date: string; first_order_date: string }
      > = {}

      ordersData.forEach((order: any) => {
        if (!order.user_id) return

        if (!customerOrders[order.user_id]) {
          customerOrders[order.user_id] = {
            orders: [],
            total_spent: 0,
            last_order_date: order.created_at,
            first_order_date: order.created_at,
          }
        }

        customerOrders[order.user_id].orders.push(order)
        customerOrders[order.user_id].total_spent += order.total_amount || 0

        // Update last and first order dates
        if (new Date(order.created_at) > new Date(customerOrders[order.user_id].last_order_date)) {
          customerOrders[order.user_id].last_order_date = order.created_at
        }
        if (new Date(order.created_at) < new Date(customerOrders[order.user_id].first_order_date)) {
          customerOrders[order.user_id].first_order_date = order.created_at
        }
      })

      // Get customer profiles
      const customerIds = Object.keys(customerOrders)
      if (customerIds.length === 0) {
        setCustomers([])
        setLoading(false)
        setIsRefreshing(false)
        return
      }

      // Get customer profiles using the admin API
      const profilesResponse = await fetch(`/api/admin/get-customer-profiles?customerIds=${customerIds.join(",")}`)
      if (!profilesResponse.ok) {
        const errorData = await profilesResponse.json()
        throw new Error(errorData.error || "Müşteri profilleri alınamadı")
      }

      const profilesData = await profilesResponse.json()

      // Combine data
      const customersData = profilesData.map((profile: any) => {
        const orderData = customerOrders[profile.id] || {
          orders: [],
          total_spent: 0,
          last_order_date: null,
          first_order_date: null,
        }

        return {
          id: profile.id,
          full_name: profile.full_name || "İsimsiz Müşteri",
          email: profile.email || "",
          phone: profile.phone || "",
          total_orders: orderData.orders.length,
          total_spent: orderData.total_spent,
          last_order_date: orderData.last_order_date,
          first_order_date: orderData.first_order_date,
          average_order_value: orderData.orders.length > 0 ? orderData.total_spent / orderData.orders.length : 0,
        }
      })

      setCustomers(customersData)
    } catch (error: any) {
      console.error("Error fetching customers:", error)
      toast({
        title: "Hata",
        description: "Müşteriler yüklenirken bir hata oluştu: " + (error.message || "Bilinmeyen hata"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  function formatDate(dateString?: string) {
    if (!dateString) return "-"
    try {
      return format(new Date(dateString), "d MMMM yyyy", { locale: tr })
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString
    }
  }

  function formatCurrency(amount: number) {
    return amount.toLocaleString("tr-TR", {
      style: "currency",
      currency: "TRY",
    })
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">Satıcı Paneli Yükleniyor</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Lütfen bekleyin, bilgileriniz hazırlanıyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <SellerSidebar />

      {/* Mobile Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <div className="p-4 border-b flex items-center justify-between">
            <h1 className="text-xl font-bold">Satıcı Panel</h1>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="px-2 space-y-1">{/* Menu items would go here */}</nav>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 p-6 overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-gray-800 border-b p-4 flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Müşteriler</h1>
          <div className="w-6"></div> {/* Spacer for alignment */}
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Müşteriler</h1>
              <p className="text-gray-500 dark:text-gray-400">
                Mağazanızdan alışveriş yapan müşterilerin listesi ve istatistikleri
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-2">
              <Button variant="outline" onClick={fetchCustomers} disabled={isRefreshing} className="flex items-center">
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Yenile
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Müşteri ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sıralama" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_order_date">Son Sipariş Tarihi</SelectItem>
                  <SelectItem value="total_orders">Sipariş Sayısı</SelectItem>
                  <SelectItem value="total_spent">Toplam Harcama</SelectItem>
                  <SelectItem value="average_order_value">Ortalama Sipariş Tutarı</SelectItem>
                  <SelectItem value="full_name">Müşteri Adı</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sıralama Yönü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Azalan</SelectItem>
                  <SelectItem value="asc">Artan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Müşteri Listesi</CardTitle>
              <CardDescription>
                Toplam {filteredCustomers.length} müşteri
                {searchTerm ? " (arama sonuçları)" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center h-60">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                  <p className="text-lg font-medium text-gray-700">Müşteriler yükleniyor...</p>
                  <p className="text-sm text-gray-500">Lütfen bekleyin, müşteri bilgileri hazırlanıyor.</p>
                </div>
              ) : filteredCustomers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Müşteri</TableHead>
                        <TableHead>İletişim</TableHead>
                        <TableHead>Sipariş Sayısı</TableHead>
                        <TableHead>Toplam Harcama</TableHead>
                        <TableHead>Ort. Sipariş Tutarı</TableHead>
                        <TableHead>Son Sipariş</TableHead>
                        <TableHead>İlk Sipariş</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div className="font-medium">{customer.full_name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <div className="flex items-center text-sm">
                                <Mail className="h-4 w-4 mr-1 text-gray-500" />
                                {customer.email || "-"}
                              </div>
                              {customer.phone && (
                                <div className="flex items-center text-sm mt-1">
                                  <Phone className="h-4 w-4 mr-1 text-gray-500" />
                                  {customer.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <ShoppingBag className="h-4 w-4 mr-1 text-gray-500" />
                              {customer.total_orders}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1 text-gray-500" />
                              {formatCurrency(customer.total_spent)}
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(customer.average_order_value)}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                              {formatDate(customer.last_order_date)}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(customer.first_order_date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium">Müşteri bulunamadı</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {searchTerm
                      ? "Arama kriterlerinize uygun müşteri bulunamadı. Filtreleri değiştirmeyi deneyin."
                      : "Henüz mağazanızdan alışveriş yapan müşteri bulunmuyor."}
                  </p>
                  {searchTerm && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setSearchTerm("")
                      }}
                    >
                      Filtreleri Temizle
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
