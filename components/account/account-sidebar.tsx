"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { User, Package, Heart, MapPin, CreditCard, Settings, LogOut, ShoppingBag } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export default function AccountSidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const menuItems = [
    {
      title: "Hesap Bilgilerim",
      href: "/hesabim",
      icon: <User className="h-4 w-4 mr-2" />,
    },
    {
      title: "Siparişlerim",
      href: "/hesabim/siparislerim",
      icon: <Package className="h-4 w-4 mr-2" />,
    },
    {
      title: "Favorilerim",
      href: "/hesabim/favorilerim",
      icon: <Heart className="h-4 w-4 mr-2" />,
    },
    {
      title: "Adreslerim",
      href: "/hesabim/adreslerim",
      icon: <MapPin className="h-4 w-4 mr-2" />,
    },
    {
      title: "Ödeme Yöntemlerim",
      href: "/hesabim/odeme-yontemlerim",
      icon: <CreditCard className="h-4 w-4 mr-2" />,
    },
    {
      title: "Kuponlarım",
      href: "/hesabim/kuponlarim",
      icon: <ShoppingBag className="h-4 w-4 mr-2" />,
    },
    {
      title: "Hesap Ayarları",
      href: "/hesabim/ayarlar",
      icon: <Settings className="h-4 w-4 mr-2" />,
    },
  ]

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            {user?.fullName?.charAt(0) || user?.email?.charAt(0) || "U"}
          </div>
          <div>
            <p className="font-medium">{user?.fullName || "Kullanıcı"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start ${isActive ? "" : "hover:bg-muted"}`}
                >
                  {item.icon}
                  {item.title}
                </Button>
              </Link>
            )
          })}

          <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Çıkış Yap
          </Button>
        </nav>
      </CardContent>
    </Card>
  )
}
