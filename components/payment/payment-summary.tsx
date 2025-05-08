"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock } from "lucide-react"

interface PaymentSummaryProps {
  orderId: string
}

interface PaymentTransaction {
  id: string
  status: string
  amount: number
  currency: string
  payment_method: string
  created_at: string
  completed_at: string | null
  card_last_four: string | null
  installment_count: number
}

export default function PaymentSummary({ orderId }: PaymentSummaryProps) {
  const supabase = createClientComponentClient()
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPaymentDetails() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("payment_transactions")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (error) throw error
        setTransaction(data)
      } catch (err: any) {
        console.error("Ödeme detayları alınırken hata:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      fetchPaymentDetails()
    }
  }, [orderId, supabase])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ödeme Özeti</CardTitle>
          <CardDescription>Yükleniyor...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error || !transaction) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ödeme Özeti</CardTitle>
          <CardDescription>Ödeme bilgileri bulunamadı</CardDescription>
        </CardHeader>
        <CardContent>{error && <p className="text-sm text-destructive">Hata: {error}</p>}</CardContent>
      </Card>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = () => {
    switch (transaction.status) {
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
        return <Badge variant="outline">{transaction.status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ödeme Özeti</CardTitle>
        <CardDescription>Ödeme işlemi detayları</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Durum</span>
          <div>{getStatusBadge()}</div>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">İşlem Tarihi</span>
          <span>{formatDate(transaction.created_at)}</span>
        </div>

        {transaction.completed_at && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tamamlanma Tarihi</span>
            <span>{formatDate(transaction.completed_at)}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-muted-foreground">Ödeme Yöntemi</span>
          <span>
            {transaction.payment_method === "CREDIT_CARD" ? "Kredi Kartı" : transaction.payment_method}
            {transaction.card_last_four && ` (**** ${transaction.card_last_four})`}
          </span>
        </div>

        {transaction.installment_count > 1 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taksit</span>
            <span>{transaction.installment_count} Taksit</span>
          </div>
        )}

        <Separator />

        <div className="flex justify-between font-medium">
          <span>Toplam Tutar</span>
          <span>
            {transaction.amount.toFixed(2)} {transaction.currency}
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">İşlem ID: {transaction.id}</p>
      </CardFooter>
    </Card>
  )
}
