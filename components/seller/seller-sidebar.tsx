"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Store,
  Package,
  ClipboardList,
  Settings,
  DollarSign,
  BarChart2,
  Users,
  Bell,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

// Mağazalarım -> Mağazam olarak değiştirme
const menu = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/seller/dashboard" },
  { label: "Ürünler", icon: Package, href: "/seller/products" },
  { label: "Siparişler", icon: ClipboardList, href: "/seller/orders" },
  { label: "Mağazam", icon: Store, href: "/seller/stores" },
  { label: "Ödemeler", icon: DollarSign, href: "/seller/payouts" },
  { label: "Analitik", icon: BarChart2, href: "/seller/analytics" },
  { label: "Müşteriler", icon: Users, href: "/seller/customers" },
  { label: "Bildirimler", icon: Bell, href: "/seller/notifications" },
  { label: "Ayarlar", icon: Settings, href: "/seller/settings" },
]

export default function SellerSidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()

  return (
    <div className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r h-screen">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold">Satıcı Panel</h1>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-2 space-y-1">
          {menu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                pathname === item.href
                  ? "bg-gray-100 dark:bg-gray-700 text-primary"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.label}
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
  )
}
