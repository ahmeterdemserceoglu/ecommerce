"use client"

import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"

export function useProductApproval() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const approveProduct = async (productId: string) => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/products/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Ürün onaylanırken bir hata oluştu.")
      }

      toast({
        title: "Başarılı",
        description: "Ürün başarıyla onaylandı.",
      })

      return true
    } catch (error) {
      console.error("Error approving product:", error)
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Ürün onaylanırken bir hata oluştu.",
        variant: "destructive",
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  const rejectProduct = async (productId: string, reason: string) => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/products/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId, reason }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Ürün reddedilirken bir hata oluştu.")
      }

      toast({
        title: "Başarılı",
        description: "Ürün başarıyla reddedildi.",
      })

      return true
    } catch (error) {
      console.error("Error rejecting product:", error)
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Ürün reddedilirken bir hata oluştu.",
        variant: "destructive",
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    approveProduct,
    rejectProduct,
  }
}
