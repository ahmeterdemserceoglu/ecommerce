"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AddressForm } from "@/components/address/address-form"
import AccountSidebar from "@/components/account/account-sidebar"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

export default function EditAddressPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [address, setAddress] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const addressId = React.use(params).id

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const response = await fetch(`/api/addresses`)
        if (!response.ok) {
          throw new Error("Adres yüklenirken bir hata oluştu")
        }

        const data = await response.json()
        const foundAddress = data.addresses?.find((a: any) => a.id === addressId)

        if (!foundAddress) {
          throw new Error("Adres bulunamadı")
        }

        setAddress(foundAddress)
      } catch (error: any) {
        toast({
          title: "Hata",
          description: error.message,
          variant: "destructive",
        })
        router.push("/hesabim/adreslerim")
      } finally {
        setLoading(false)
      }
    }

    fetchAddress()
  }, [addressId, router])

  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <AccountSidebar />
        </div>
        <div className="md:col-span-3">
          <div className="mb-6">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href="/hesabim/adreslerim">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Adreslerime Dön
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Adresi Düzenle</h1>
            <p className="text-muted-foreground">Mevcut adres bilgilerinizi güncelleyin.</p>
          </div>

          <div className="border rounded-lg p-6">
            {loading ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-24 w-full" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
            ) : (
              <AddressForm address={address} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
