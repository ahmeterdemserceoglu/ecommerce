"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Database, Loader2 } from "lucide-react"

export function InitializeDatabaseButton() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleInitializeDatabase = async () => {
    try {
      setLoading(true)

      const response = await fetch("/api/admin/initialize-database", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Veritabanı başlatılırken bir hata oluştu")
      }

      toast({
        title: "Başarılı",
        description: "Veritabanı başarıyla başlatıldı.",
      })
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Veritabanı başlatılırken bir hata oluştu",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleInitializeDatabase} disabled={loading} className="bg-green-600 hover:bg-green-700">
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Başlatılıyor...
        </>
      ) : (
        <>
          <Database className="mr-2 h-4 w-4" />
          Veritabanını Başlat
        </>
      )}
    </Button>
  )
}
