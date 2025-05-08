import type { Metadata } from "next"
import Link from "next/link"
import { AddressForm } from "@/components/address/address-form"
import AccountSidebar from "@/components/account/account-sidebar"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Yeni Adres Ekle",
  description: "Yeni teslimat veya fatura adresi ekleyin",
}

export default function AddAddressPage() {
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
            <h1 className="text-2xl font-bold">Yeni Adres Ekle</h1>
            <p className="text-muted-foreground">Teslimat ve fatura işlemleri için yeni bir adres ekleyin.</p>
          </div>

          <div className="border rounded-lg p-6">
            <AddressForm />
          </div>
        </div>
      </div>
    </div>
  )
}
