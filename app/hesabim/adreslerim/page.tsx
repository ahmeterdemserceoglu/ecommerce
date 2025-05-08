import type { Metadata } from "next"
import { AddressList } from "@/components/address/address-list"
import AccountSidebar from "@/components/account/account-sidebar"

export const metadata: Metadata = {
  title: "Adreslerim",
  description: "Teslimat ve fatura adreslerinizi yönetin",
}

export default function AddressesPage() {
  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <AccountSidebar />
        </div>
        <div className="md:col-span-3">
          <AddressList />
        </div>
      </div>
    </div>
  )
}
