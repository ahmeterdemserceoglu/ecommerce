import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import AddCardForm from "@/components/payment/add-card-form"

export default async function AddPaymentMethodPage() {
  const supabase = createServerComponentClient({ cookies })

  // Kullanıcı oturumunu kontrol et
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/login?callbackUrl=/hesabim/odeme-yontemlerim/ekle")
  }

  const userId = session.user.id

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Yeni Ödeme Yöntemi Ekle</h1>
      <AddCardForm userId={userId} />
    </div>
  )
}
