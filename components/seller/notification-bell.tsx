"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export function NotificationBell() {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchNotificationCount()

    // Bildirim sayısını her 30 saniyede bir güncelle
    const interval = setInterval(fetchNotificationCount, 30000)

    // Cleanup
    return () => clearInterval(interval)
  }, [])

  const fetchNotificationCount = async () => {
    try {
      setLoading(true)

      // Kullanıcı kontrolü
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return
      }

      // Okunmamış bildirim sayısını al
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)

      if (error) throw error

      setCount(count || 0)
    } catch (error) {
      console.error("Bildirim sayısı alınamadı:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <a href="/seller/notifications">
        <Bell className="h-5 w-5" />
        {!loading && count > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500">
            {count > 9 ? "9+" : count}
          </Badge>
        )}
        <span className="sr-only">Bildirimler</span>
      </a>
    </Button>
  )
}
