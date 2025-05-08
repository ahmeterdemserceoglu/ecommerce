"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, Clock, CreditCard, Download } from "lucide-react"
import SavedCards from "@/components/payment/saved-cards"

export default function PaymentsPage() {
  const supabase = createClientComponentClient()
  const auth = (useAuth() as any) || {}
  const user = auth.user
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPayments() {
      if (!user) return

      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("payment_transactions")
          .select(`
            *,
            order:orders(id, status, created_at),
            store:stores(id, name, slug)
          `)
          .eq("orders.user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) throw error
        setTransactions(data || [])
      } catch (err) {
        console.error("Ödeme geçmişi yüklenirken hata:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchPayments()
  }, [user, supabase])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="mr-1 h-3 w-3" /> Tamamlandı
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" /> Başarısız
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" /> Bekliyor
          </Badge>
        )
      case "processing":
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" /> İşleniyor
          </Badge>
        )
      case "refunded":
        return (
          <Badge variant="secondary">
            <CheckCircle className="mr-1 h-3 w-3" /> İade Edildi
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="container py-10 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Ödemelerim</h1>

      <Tabs defaultValue="history">
        <TabsList className="mb-6">
          <TabsTrigger value="history">Ödeme Geçmişi</TabsTrigger>
          <TabsTrigger value="cards">Kayıtlı Kartlarım</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Ödeme Geçmişi</CardTitle>
              <CardDescription>Tüm ödeme işlemlerinizi görüntüleyin</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Yükleniyor...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">Henüz bir ödeme işleminiz bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">
                            {transaction.store?.name || "Mağaza"} - Sipariş #{transaction.order_id}
                          </h3>
                          <p className="text-sm text-muted-foreground">{formatDate(transaction.created_at)}</p>
                        </div>
                        <div>{getStatusBadge(transaction.status)}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                        <div className="text-muted-foreground">Ödeme Yöntemi</div>
                        <div>
                          {transaction.payment_method === "CREDIT_CARD" ? "Kredi Kartı" : transaction.payment_method}
                          {transaction.card_last_four && ` (**** ${transaction.card_last_four})`}
                        </div>

                        {transaction.installment_count > 1 && (
                          <>
                            <div className="text-muted-foreground">Taksit</div>
                            <div>{transaction.installment_count} Taksit</div>
                          </>
                        )}

                        <div className="text-muted-foreground">Tutar</div>
                        <div className="font-medium">
                          {transaction.amount.toFixed(2)} {transaction.currency}
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="flex justify-between items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/odeme/basarili?orderId=${transaction.order_id}`, "_blank")}
                        >
                          Sipariş Detayları
                        </Button>
                        {transaction.status === "completed" && (
                          <Button variant="outline" size="sm" className="flex items-center gap-1">
                            <Download className="h-4 w-4" /> Fatura
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards">{user && <SavedCards userId={user.id} />}</TabsContent>
      </Tabs>
    </div>
  )
}
