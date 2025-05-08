"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  RefreshCw,
  Download,
  Upload,
  Trash,
  AlertTriangle,
  CheckCircle,
  AlertOctagon,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function DatabasePage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [sqlQuery, setSqlQuery] = useState("")
  const [queryResult, setQueryResult] = useState<any>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [dbStats, setDbStats] = useState<any>({
    tables: 0,
    rows: {},
    lastBackup: null,
    dbSize: null,
  })
  const [backupProgress, setBackupProgress] = useState(0)
  const [isBackingUp, setIsBackingUp] = useState(isBackingUp)
  const [needsUpdate, setNeedsUpdate] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [backupErrors, setBackupErrors] = useState<string[]>([])
  const supabase = createClientComponentClient()

  // Şifreli sıfırlama ve temizleme için state
  const [resetPassword, setResetPassword] = useState("")
  const [deletePassword, setDeletePassword] = useState("")
  const [resetError, setResetError] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [isResetting, setIsResetting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [myResetPassword, setMyResetPassword] = useState("")
  const [myDeletePassword, setMyDeletePassword] = useState("")
  const [pwUpdateMsg, setPwUpdateMsg] = useState("")
  const [hasPassword, setHasPassword] = useState(false)

  useEffect(() => {
    // Check if user is admin
    if (!authLoading && user) {
      if (user.role !== "admin") {
        router.push("/")
        return
      }
    } else if (!authLoading && !user) {
      router.push("/auth/login?returnTo=/admin/database")
      return
    }

    const fetchDatabaseStats = async () => {
      try {
        setLoading(true)
        setNeedsUpdate(false)

        // Get all database stats in one call
        const { data: stats, error: statsError } = await supabase.rpc("get_database_stats")

        if (statsError) {
          console.error("Error fetching database stats:", statsError)
          setNeedsUpdate(true)
          throw statsError
        }

        // Update stats
        setDbStats({
          tables: stats.total_tables || 0,
          rows: stats.tables || {},
          lastBackup: localStorage.getItem("lastBackupDate") || null,
          dbSize: stats.database_size || null,
          lastUpdated: stats.last_updated || null,
        })

        return stats
      } catch (error) {
        console.error("Error fetching database stats:", error)
        setNeedsUpdate(true)
        toast({
          title: "Hata",
          description: "Veritabanı istatistikleri alınırken bir hata oluştu. Lütfen sayfayı yenileyin.",
          variant: "destructive",
        })
        return null
      } finally {
        setLoading(false)
      }
    }

    if (user && user.role === "admin") {
      fetchDatabaseStats()
    }
  }, [user, authLoading, router, supabase, toast])

  // Şifreleri yükle (kendi şifresi)
  useEffect(() => {
    if (user && user.id) {
      supabase
        .from("admin_reset_secrets")
        .select("reset_password, delete_password")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setMyResetPassword(data.reset_password || "")
            setMyDeletePassword(data.delete_password || "")
            setHasPassword(true)
          } else {
            setHasPassword(false)
          }
        })
    }
  }, [user])

  const executeQuery = async () => {
    if (!sqlQuery.trim()) {
      toast({
        title: "Hata",
        description: "Lütfen bir SQL sorgusu girin.",
        variant: "destructive",
      })
      return
    }

    setIsExecuting(true)
    setQueryResult(null)
    setQueryError(null)

    try {
      const { data, error } = await supabase.rpc("execute_safe_query", {
        query: sqlQuery,
        max_rows: 1000,
        timeout_ms: 5000,
      })

      if (error) {
        throw new Error(error.message)
      }

      if (data.error) {
        throw new Error(data.error)
      }

      setQueryResult(data)
    } catch (error: any) {
      console.error("Error executing SQL query:", error)
      setQueryError(error.message || "Sorgu çalıştırılırken bir hata oluştu.")
      toast({
        title: "Hata",
        description: error.message || "Sorgu çalıştırılırken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setIsExecuting(false)
    }
  }

  // Helper function to safely fetch table data with retries
  const safelyFetchTable = async (table: string, retries = 3): Promise<any[]> => {
    try {
      // Check if table exists first
      const { data: existsData, error: existsError } = await supabase
        .rpc("check_table_exists", {
          table_name: table,
        })
        .single()

      const tableExists = existsData?.exists || false

      if (existsError || !tableExists) {
        console.log(`Table ${table} does not exist or cannot be accessed, skipping...`)
        return []
      }

      // Try to fetch with a reasonable limit to avoid memory issues
      const { data, error } = await supabase.from(table).select("*").limit(10000)

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      if (retries > 0) {
        console.log(`Retrying fetch for table ${table}, ${retries} attempts left...`)
        await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second before retry
        return safelyFetchTable(table, retries - 1)
      }

      console.error(`Failed to fetch table ${table} after multiple attempts:`, error)
      throw error
    }
  }

  // Tablo şemasını almak için fonksiyon
  async function getTableSchema(table: string) {
    const { data, error } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type, is_nullable, column_default")
      .eq("table_schema", "public")
      .eq("table_name", table)
      .order("ordinal_position", { ascending: true })

    if (error || !data) return ""

    const columns = data
      .map((col: any) => {
        let colDef = `"${col.column_name}" ${col.data_type}`
        if (col.is_nullable === "NO") colDef += " NOT NULL"
        if (col.column_default) colDef += ` DEFAULT ${col.column_default}`
        return colDef
      })
      .join(",\n  ")

    return `CREATE TABLE IF NOT EXISTS "${table}" (\n  ${columns}\n);\n`
  }

  // Tablo verilerini SQL'e dönüştürmek için fonksiyon
  function getInsertStatements(table: string, rows: any[]) {
    if (!rows || rows.length === 0) return ""
    const columns = Object.keys(rows[0])
    const values = rows.map(
      (row) =>
        "(" +
        columns.map((col) => (row[col] === null ? "NULL" : `'${String(row[col]).replace(/'/g, "''")}'`)).join(", ") +
        ")",
    )
    return `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES\n${values.join(",\n")};\n`
  }

  // handleBackupDatabase fonksiyonunu güncelle
  const handleBackupDatabase = async () => {
    setIsBackingUp(true)
    setBackupProgress(0)
    setBackupErrors([])

    try {
      let tables: string[] = []
      try {
        const { data: tableData, error: tableError } = await supabase
          .from("information_schema.tables")
          .select("table_name")
          .eq("table_schema", "public")
          .eq("table_type", "BASE TABLE")
        if (tableError || !tableData) {
          tables = Object.keys(dbStats.rows)
        } else {
          tables = tableData.map((t: any) => t.table_name)
        }
      } catch (error) {
        tables = Object.keys(dbStats.rows)
      }

      const totalTables = tables.length
      const errors: string[] = []
      let sqlDump = ""

      for (let i = 0; i < totalTables; i++) {
        const table = tables[i]
        try {
          // Şema
          const schema = await getTableSchema(table)
          sqlDump += schema + "\n"
          // Veri
          const data = await safelyFetchTable(table)
          sqlDump += getInsertStatements(table, data) + "\n"
        } catch (error: any) {
          console.error(`Error backing up table ${table}:`, error)
          errors.push(`${table}: ${error.message || "Unknown error"}`)
        }
        setBackupProgress(Math.round(((i + 1) / totalTables) * 100))
      }

      if (errors.length > 0) {
        setBackupErrors(errors)
        toast({
          title: "Uyarı",
          description: `Bazı tablolar yedeklenemedi (${errors.length}/${totalTables}). Detaylar için hata listesine bakın.`,
          variant: "destructive",
        })
      }

      // SQL dosyasını indir
      const blob = new Blob([sqlDump], { type: "text/sql" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `database_backup_${new Date().toISOString().slice(0, 10)}.sql`
      link.click()
      URL.revokeObjectURL(url)

      // Save backup date
      const now = new Date().toLocaleString("tr-TR")
      localStorage.setItem("lastBackupDate", now)
      setDbStats({ ...dbStats, lastBackup: now })

      if (errors.length === 0) {
        toast({
          title: "Başarılı",
          description: "Veritabanı yedeklemesi başarıyla tamamlandı.",
        })
      }
    } catch (error: any) {
      console.error("Error backing up database:", error)
      toast({
        title: "Hata",
        description: `Veritabanı yedeklenirken bir hata oluştu: ${error.message || "Bilinmeyen hata"}`,
        variant: "destructive",
      })
    } finally {
      setIsBackingUp(false)
    }
  }

  async function runDatabaseUpdate() {
    try {
      const response = await fetch("/api/admin/update-database", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Başarılı",
          description: "Veritabanı başarıyla güncellendi.",
        })
        // Refresh the page to show updated data
        window.location.reload()
      } else {
        toast({
          title: "Hata",
          description: result.error || "Veritabanı güncellenirken bir hata oluştu.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error running database update:", error)
      toast({
        title: "Hata",
        description: "Veritabanı güncellenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  async function updateDatabaseFunctions() {
    setIsUpdating(true)
    try {
      const response = await fetch("/api/admin/update-database-functions", {
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
        toast({
          title: "Hata",
          description: result.error || "Veritabanı fonksiyonları oluşturulurken bir hata oluştu.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating database functions:", error)
      toast({
        title: "Hata",
        description: "Veritabanı fonksiyonları oluşturulurken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // Veritabanı şifre kontrolü fonksiyonu (örnek Supabase tablosu: admin_secrets, alan: type, value)
  async function checkDbPassword(type: "reset" | "delete", password: string) {
    const { data, error } = await supabase.from("admin_secrets").select("value").eq("type", type).single()
    if (error || !data) return false
    return data.value === password
  }

  // Sıfırlama işlemi (tüm verileri sil, tabloları koru)
  async function handleResetDatabase() {
    setIsResetting(true)
    setResetError("")
    const valid = await checkDbPassword("reset", resetPassword)
    if (!valid) {
      setResetError("Şifre yanlış!")
      setIsResetting(false)
      return
    }
    // Tüm tabloları bul ve truncate et
    const { data: tables } = await supabase.rpc("get_table_names")
    if (Array.isArray(tables)) {
      for (const t of tables) {
        await supabase.rpc("truncate_table", { table_name: t })
      }
    }
    setIsResetting(false)
    window.location.reload()
  }

  // Temizleme işlemi (tüm tabloları ve verileri sil)
  async function handleDeleteDatabase() {
    setIsDeleting(true)
    setDeleteError("")
    const valid = await checkDbPassword("delete", deletePassword)
    if (!valid) {
      setDeleteError("Şifre yanlış!")
      setIsDeleting(false)
      return
    }
    // Tüm tabloları bul ve drop et
    const { data: tables } = await supabase.rpc("get_table_names")
    if (Array.isArray(tables)) {
      for (const t of tables) {
        await supabase.rpc("drop_table", { table_name: t })
      }
    }
    setIsDeleting(false)
    window.location.reload()
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
          <h1 className="text-xl font-bold">Veritabanı</h1>
          <div className="w-6"></div> {/* Spacer for alignment */}
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold">Veritabanı Yönetimi</h1>
              <div className="flex gap-2">
                <Button onClick={runDatabaseUpdate} variant="outline">
                  Veritabanı Güncelleme Çalıştır
                </Button>
                {needsUpdate && (
                  <Button onClick={updateDatabaseFunctions} variant="default" disabled={isUpdating}>
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

            {needsUpdate && (
              <Alert variant="destructive" className="mb-4">
                <AlertOctagon className="h-4 w-4" />
                <AlertTitle>Veritabanı Güncellemesi Gerekli</AlertTitle>
                <AlertDescription>
                  Veritabanı fonksiyonları eksik. Veritabanı istatistiklerini görmek için "Veritabanı Fonksiyonlarını
                  Oluştur" butonuna tıklayın.
                </AlertDescription>
              </Alert>
            )}

            {backupErrors.length > 0 && (
              <Alert variant="warning" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Yedekleme Sırasında Bazı Hatalar Oluştu</AlertTitle>
                <AlertDescription>
                  <details>
                    <summary className="cursor-pointer font-medium">
                      Hata detaylarını göster ({backupErrors.length})
                    </summary>
                    <ul className="mt-2 text-sm space-y-1 list-disc list-inside">
                      {backupErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </details>
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="overview">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
                <TabsTrigger value="query">SQL Sorgusu</TabsTrigger>
                <TabsTrigger value="backup">Yedekleme</TabsTrigger>
                <TabsTrigger value="fix-orders">Tablo Düzeltmeleri</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Veritabanı İstatistikleri</CardTitle>
                      <CardDescription>Veritabanı tablolarının genel durumu</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Toplam Tablo Sayısı</span>
                            <span className="font-bold">{dbStats.tables}</span>
                          </div>
                        </div>
                        {dbStats.dbSize && (
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Veritabanı Boyutu</span>
                              <span className="font-medium">{dbStats.dbSize.size_pretty}</span>
                            </div>
                          </div>
                        )}
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Son Yedekleme</span>
                            <span className="font-medium">
                              {dbStats.lastBackup ? dbStats.lastBackup : "Hiç yedeklenmedi"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full" onClick={() => handleBackupDatabase()}>
                        <Download className="mr-2 h-4 w-4" />
                        Veritabanını Yedekle
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Tablo İstatistikleri</CardTitle>
                      <CardDescription>Tablolardaki kayıt sayıları</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Tablo Adı</TableHead>
                            <TableHead className="text-right">Satır Sayısı</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.isArray(dbStats.rows) &&
                            dbStats.rows.map((table: any) => (
                              <TableRow key={table.table_name}>
                                <TableCell className="font-medium">{table.table_name}</TableCell>
                                <TableCell className="text-right">
                                  {typeof table.row_count === "number"
                                    ? table.row_count.toLocaleString()
                                    : table.row_count}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="query">
                <Card>
                  <CardHeader>
                    <CardTitle>SQL Sorgusu Çalıştır</CardTitle>
                    <CardDescription>
                      Veritabanında SQL sorguları çalıştırabilirsiniz. Dikkatli olun, bu işlem geri alınamaz.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="sqlQuery">SQL Sorgusu</Label>
                        <Textarea
                          id="sqlQuery"
                          placeholder="SELECT * FROM products LIMIT 10;"
                          value={sqlQuery}
                          onChange={(e) => setSqlQuery(e.target.value)}
                          className="font-mono h-32"
                        />
                      </div>
                      <Button onClick={executeQuery} disabled={isExecuting} className="w-full">
                        {isExecuting ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Çalıştırılıyor...
                          </>
                        ) : (
                          <>
                            <Database className="mr-2 h-4 w-4" />
                            Sorguyu Çalıştır
                          </>
                        )}
                      </Button>
                    </div>

                    {queryError && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-start">
                          <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-red-800">Hata</h4>
                            <p className="text-sm text-red-700">{queryError}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {queryResult && (
                      <div className="mt-4 border rounded-md overflow-hidden">
                        <div className="p-4 bg-green-50 border-b border-green-200">
                          <div className="flex items-center">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                            <h4 className="font-medium text-green-800">Sorgu başarıyla çalıştırıldı</h4>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          {Array.isArray(queryResult) && queryResult.length > 0 ? (
                            <table className="w-full">
                              <thead>
                                <tr className="bg-gray-50 border-b">
                                  {Object.keys(queryResult[0]).map((key) => (
                                    <th
                                      key={key}
                                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                      {key}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {queryResult.map((row, i) => (
                                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                    {Object.values(row).map((value: any, j) => (
                                      <td key={j} className="px-4 py-2 text-sm">
                                        {typeof value === "object" ? JSON.stringify(value) : String(value)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="p-4 text-center text-gray-500">
                              {Array.isArray(queryResult) ? "Sonuç bulunamadı" : "Sorgu başarıyla çalıştırıldı"}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="backup">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Veritabanı Yedekleme</CardTitle>
                      <CardDescription>Veritabanınızı yedekleyin ve indirin</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Veritabanınızın tam bir yedeğini alın. Bu işlem, tüm tabloları ve verileri içeren bir JSON
                          dosyası oluşturacaktır.
                        </p>
                        {isBackingUp && (
                          <div className="space-y-2">
                            <Progress value={backupProgress} className="h-2" />
                            <p className="text-xs text-center text-muted-foreground">
                              Yedekleniyor... %{backupProgress}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button onClick={handleBackupDatabase} disabled={isBackingUp} className="w-full">
                        {isBackingUp ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Yedekleniyor...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Veritabanını Yedekle
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Veritabanı Geri Yükleme</CardTitle>
                      <CardDescription>Yedekten veritabanını geri yükleyin</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Daha önce aldığınız bir yedeği geri yükleyin. Bu işlem mevcut verilerin üzerine yazacaktır.
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="backupFile">Yedek Dosyası</Label>
                          <Input id="backupFile" type="file" accept=".json" />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="w-full">
                            <Upload className="mr-2 h-4 w-4" />
                            Veritabanını Geri Yükle
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Veritabanını Geri Yükle</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bu işlem mevcut veritabanı verilerinin üzerine yazacaktır. Bu işlem geri alınamaz. Devam
                              etmek istediğinizden emin misiniz?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-500 hover:bg-red-600">
                              Evet, Geri Yükle
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  </Card>

                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Tehlikeli İşlemler</CardTitle>
                      <CardDescription>Dikkatli kullanılması gereken veritabanı işlemleri</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Bu işlemler veritabanınıza kalıcı değişiklikler yapacaktır. Dikkatli olun.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-600"
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Veritabanını Sıfırla
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Veritabanını Sıfırla</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bu işlem tüm tabloları koruyacak ancak içindeki verileri silecektir. Bu işlem geri
                                  alınamaz. Devam etmek için şifre girin.
                                </AlertDialogDescription>
                                <Input
                                  type="password"
                                  placeholder="Şifre"
                                  value={resetPassword}
                                  onChange={(e) => setResetPassword(e.target.value)}
                                  disabled={isResetting}
                                />
                                {resetError && <div className="text-red-500 text-sm">{resetError}</div>}
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-orange-500 hover:bg-orange-600"
                                  onClick={handleResetDatabase}
                                  disabled={isResetting}
                                >
                                  {isResetting ? "Sıfırlanıyor..." : "Evet, Sıfırla"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full border-red-200 bg-red-50 hover:bg-red-100 text-red-600"
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Veritabanını Temizle
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Veritabanını Temizle</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bu işlem tüm tabloları ve içindeki verileri silecektir. Bu işlem geri alınamaz. Devam
                                  etmek için şifre girin.
                                </AlertDialogDescription>
                                <Input
                                  type="password"
                                  placeholder="Şifre"
                                  value={deletePassword}
                                  onChange={(e) => setDeletePassword(e.target.value)}
                                  disabled={isDeleting}
                                />
                                {deleteError && <div className="text-red-500 text-sm">{deleteError}</div>}
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-500 hover:bg-red-600"
                                  onClick={handleDeleteDatabase}
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? "Temizleniyor..." : "Evet, Temizle"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="fix-orders">
                <Card>
                  <CardHeader>
                    <CardTitle>Tablo Düzeltmeleri</CardTitle>
                    <CardDescription>Veritabanı tablolarında düzeltmeler yapın</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">Orders Tablosu Düzeltmesi</h3>
                        <p className="text-sm text-muted-foreground">
                          Orders tablosuna store_id sütunu ekler ve ilişkili tabloları günceller. Bu işlem, ödeme
                          sistemi ile ilgili hataları çözecektir.
                        </p>
                      </div>
                      <Button
                        onClick={async () => {
                          try {
                            const response = await fetch("/api/admin/fix-orders-table", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                            })

                            const result = await response.json()

                            if (result.success) {
                              toast({
                                title: "Başarılı",
                                description: "Orders tablosu başarıyla güncellendi.",
                              })
                            } else {
                              toast({
                                title: "Hata",
                                description: result.message || "Orders tablosu güncellenirken bir hata oluştu.",
                                variant: "destructive",
                              })
                            }
                          } catch (error) {
                            console.error("Orders tablosu güncelleme hatası:", error)
                            toast({
                              title: "Hata",
                              description: "Orders tablosu güncellenirken bir hata oluştu.",
                              variant: "destructive",
                            })
                          }
                        }}
                        className="w-full"
                      >
                        <Database className="mr-2 h-4 w-4" />
                        Orders Tablosunu Düzelt
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
