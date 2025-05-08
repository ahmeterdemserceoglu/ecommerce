"use client"

import type React from "react"

import { useState, useEffect, useContext } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Search, ShoppingCart, Heart, User, Menu, Store, LogOut, Settings, Package, ChevronDown } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { CartContext } from "@/providers/cart-provider"

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading: authLoading, initialLoadComplete, signOut } = useAuth()
  const { cartItemsCount = 0 } = useContext(CartContext)
  const [categories, setCategories] = useState<any[]>([])
  const [isScrolled, setIsScrolled] = useState(false)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  // Check if mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkIfMobile()
    window.addEventListener("resize", checkIfMobile)

    return () => {
      window.removeEventListener("resize", checkIfMobile)
    }
  }, [])

  // Fetch categories from the database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("id, name, slug")
          .is("parent_id", null)
          .order("sort_order", { ascending: true })
          .limit(8)

        if (error) throw error
        setCategories(data || [])
      } catch (error) {
        console.error("Kategoriler yüklenirken hata:", error)
        setCategories([])
      }
    }

    // Fetch announcements
    const fetchAnnouncements = async () => {
      try {
        const now = new Date().toISOString()
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .eq("is_active", true)
          .lte("start_date", now)
          .or(`end_date.is.null,end_date.gt.${now}`)
          .order("created_at", { ascending: false })

        if (error) throw error
        setAnnouncements(data || [])
      } catch (error) {
        console.error("Duyurular yüklenirken hata:", error)
      }
    }

    fetchCategories()
    fetchAnnouncements()
  }, [supabase])

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault()
    await signOut()
    router.push("/")
    toast({ title: "Çıkış yapılıyor...", description: "Güle güle!" })
  }

  return (
    <header className={`sticky top-0 z-40 w-full bg-white dark:bg-gray-950 shadow-sm`}>
      {/* Duyurular */}
      {announcements.length > 0 && announcements[0].position === "top" && (
        <div
          className="w-full py-2 text-center text-sm font-medium"
          style={{
            backgroundColor: announcements[0].background_color || "#f3f4f6",
            color: announcements[0].text_color || "#1f2937",
          }}
        >
          {announcements[0].content}
        </div>
      )}

      {/* Main Header */}
      <div className="max-w-[1440px] mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>HDTicaret</SheetTitle>
                </SheetHeader>
                <div className="py-4">
                  <div className="space-y-1">
                    {categories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/kategori/${category.slug}`}
                        className="block py-2 px-3 rounded-md hover:bg-muted"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                  <div className="mt-6 pt-6 border-t space-y-1">
                    <Link href="/kampanyalar" className="block py-2 px-3 rounded-md hover:bg-muted">
                      Kampanyalar
                    </Link>
                    <Link href="/blog" className="block py-2 px-3 rounded-md hover:bg-muted">
                      Blog
                    </Link>
                    <Link href="/satici-ol" className="block py-2 px-3 rounded-md hover:bg-muted">
                      Satıcı Ol
                    </Link>
                    <Link href="/yardim" className="block py-2 px-3 rounded-md hover:bg-muted">
                      Yardım
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="relative h-10 w-32">
              <div className="flex items-center">
                <span className="text-2xl font-bold text-orange-500">HD</span>
                <span className="text-2xl font-bold">Ticaret</span>
              </div>
            </div>
          </Link>

          {/* Search */}
          <div className="hidden md:flex flex-1 mx-6">
            <form className="flex w-full max-w-lg" action="/search">
              <Input
                name="q"
                placeholder="Ürün, kategori veya mağaza ara..."
                className="rounded-r-none focus-visible:ring-0 focus-visible:ring-transparent"
              />
              <Button type="submit" className="rounded-l-none bg-orange-500 hover:bg-orange-600">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Search (Mobile) */}
            <Link href="/search" className="md:hidden">
              <Button variant="ghost" size="icon">
                <Search className="h-5 w-5" />
              </Button>
            </Link>

            {/* Favorites */}
            <Link href="/favoriler">
              <Button variant="ghost" size="icon" className="relative">
                <Heart className="h-5 w-5" />
              </Button>
            </Link>

            {/* Cart */}
            <Link href="/sepet">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {Number(cartItemsCount)}
                  </span>
                )}
              </Button>
            </Link>

            {/* Admin/Seller Panel Button */}
            {user && (user.role === "admin" || user.role === "seller") && (
              <Link href={user.role === "admin" ? "/admin/dashboard" : "/seller/dashboard"}>
                <Button variant="outline" size="sm" className="hidden md:flex">
                  {user.role === "admin" ? (
                    <>
                      <Settings className="mr-2 h-4 w-4" />
                      Admin Panel
                    </>
                  ) : (
                    <>
                      <Store className="mr-2 h-4 w-4" />
                      Satıcı Panel
                    </>
                  )}
                </Button>
              </Link>
            )}

            {/* User Menu */}
            {!initialLoadComplete ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                {!isMobile && <Skeleton className="h-6 w-24" />}
              </div>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size={isMobile ? "icon" : "default"}
                    className="gap-2"
                    onClick={(e) => e.preventDefault()} // Prevent default to avoid navigation
                  >
                    <User className="h-5 w-5" />
                    {!isMobile && (
                      <>
                        <span className="max-w-[100px] truncate">{user?.fullName || "Hesabım"}</span>
                        <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm font-medium">{user?.fullName || "Kullanıcı"}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/hesabim/siparislerim" className="flex items-center w-full cursor-pointer">
                      <Package className="mr-2 h-4 w-4" />
                      Siparişlerim
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/hesabim/favorilerim" className="flex items-center w-full cursor-pointer">
                      <Heart className="mr-2 h-4 w-4" />
                      Favorilerim
                    </Link>
                  </DropdownMenuItem>
                  {user?.role === "seller" && (
                    <DropdownMenuItem asChild>
                      <Link href="/seller/dashboard" className="flex items-center w-full cursor-pointer">
                        <Store className="mr-2 h-4 w-4" />
                        Satıcı Paneli
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user?.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/dashboard" className="flex items-center w-full cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Admin Paneli
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault()
                      handleSignOut(e)
                    }}
                    className="cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth/login">
                <Button variant="ghost" size={isMobile ? "icon" : "default"} className="gap-2">
                  <User className="h-5 w-5" />
                  {!isMobile && <span>Giriş Yap</span>}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden p-2 border-t border-gray-200 dark:border-gray-800">
        <form className="flex w-full" action="/search">
          <Input
            name="q"
            placeholder="Ürün, kategori veya mağaza ara..."
            className="rounded-r-none focus-visible:ring-0 focus-visible:ring-transparent"
          />
          <Button type="submit" className="rounded-l-none bg-orange-500 hover:bg-orange-600">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  )
}
