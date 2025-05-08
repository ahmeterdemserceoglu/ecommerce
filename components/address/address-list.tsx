"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AddressCard } from "@/components/address/address-card"
import { Plus, RefreshCw } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

export function AddressList() {
  const [addresses, setAddresses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAddresses = async () => {
    try {
      const response = await fetch("/api/addresses")
      if (!response.ok) {
        throw new Error("Adresler yüklenirken bir hata oluştu")
      }
      const data = await response.json()
      setAddresses(data.addresses || [])
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAddresses()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAddresses()
  }

  const handleDelete = () => {
    fetchAddresses()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="border rounded-lg p-6">
            <div className="flex justify-between mb-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="flex justify-between mt-6">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Adreslerim</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Yenile
          </Button>
          <Button size="sm" asChild>
            <Link href="/hesabim/adreslerim/ekle">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Adres Ekle
            </Link>
          </Button>
        </div>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <h3 className="text-lg font-medium mb-2">Henüz adres eklenmemiş</h3>
          <p className="text-muted-foreground mb-6">Siparişleriniz için teslimat ve fatura adresi ekleyebilirsiniz.</p>
          <Button asChild>
            <Link href="/hesabim/adreslerim/ekle">
              <Plus className="h-4 w-4 mr-2" />
              Adres Ekle
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
