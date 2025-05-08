"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Wallet } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

export default function SellerPayoutsPage() {
  const router = useRouter()

  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [showPayoutDialog, setShowPayoutDialog] = useState(false)

  // Yeni ödeme isteği için state
  const [newPayout, setNewPayout] = useState({
    amount: "",
    bankAccountId: "",
    description: "Satıcı ödemesi",
    iban: ""
  })
  const [useCustomIban, setUseCustomIban] = useState(false)

  useEffect(() => {
    fetchPayoutData()
    fetchBankAccounts()
  }, [])

  const fetchPayoutData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/seller/payouts")
      const data = await response.json()

      if (data.success) {
        setSummary(data.summary)
        setHistory(data.history)
      } else {
        toast({
          title: "Hata",
          description: data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Ödeme bilgileri alınırken hata:", error)
      toast({
        title: "Hata",
        description: "Ödeme bilgileri alınırken bir hata oluştu",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchBankAccounts = async () => {
    try {
      const response = await fetch("/api/seller/payment-settings")
      const data = await response.json()

      if (data.success) {
        setBankAccounts(data.bankAccounts)

        // Varsayılan banka hesabını seç
        const defaultAccount = data.bankAccounts.find((account: any) => account.is_default)
        if (defaultAccount) {
          setNewPayout({
            ...newPayout,
            bankAccountId: defaultAccount.id,
          })
        }
      }
    } catch (error) {
      console.error("Banka hesapları alınırken hata:", error)
    }
  }

  const requestPayout = async () => {
    if (!newPayout.amount || !newPayout.bankAccountId && !useCustomIban) {
      toast({
        title: "Hata",
        description: "Tutar ve banka hesabı seçmelisiniz",
        variant: "destructive",
      })
      return
    }
    if (summary && Number(newPayout.amount) > summary.netIncome) {
      toast({
        title: "Hata",
        description: "Talep edilen tutar mevcut bakiyeden fazla olamaz",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const response = await fetch("/api/seller/payouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPayout),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Başarılı",
          description: "Ödeme talebi oluşturuldu",
        })
        setShowPayoutDialog(false)
        setNewPayout({
          amount: "",
          bankAccountId: newPayout.bankAccountId,
          description: "Satıcı ödemesi",
          iban: ""
        })
        fetchPayoutData()
      } else {
        toast({
          title: "Hata",
          description: data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Ödeme talebi oluşturulurken hata:", error)
      toast({
        title: "Hata",
        description: "Ödeme talebi oluşturulurken bir hata oluştu",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Bekliyor
          </Badge>
        )
      case "PROCESSING":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            İşleniyor
          </Badge>
        )
      case "COMPLETED":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            Tamamlandı
          </Badge>
        )
      case "FAILED":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            Başarısız
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Ödemeler</h1>
        <Button onClick={() => setShowPayoutDialog(true)}>
          <Wallet className="w-4 h-4 mr-2" />
          Ödeme Talebi Oluştur
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Satış</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalSales.toLocaleString("tr-TR")} TL</div>
              <p className="text-xs text-muted-foreground mt-1">Tüm zamanlar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Gelir</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.netIncome.toLocaleString("tr-TR")} TL</div>
              <p className="text-xs text-muted-foreground mt-1">Komisyon ve vergiler düşülmüş</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bekleyen Ödemeler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.pendingPayouts.toLocaleString("tr-TR")} TL</div>
              <p className="text-xs text-muted-foreground mt-1">İşlem bekleyen ödemeler</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ödeme Geçmişi</CardTitle>
          <CardDescription>Tüm ödeme işlemlerinizin geçmişi ve durumları</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Banka</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>{format(new Date(payout.created_at), "dd.MM.yyyy HH:mm")}</TableCell>
                    <TableCell className="font-medium">{payout.amount.toLocaleString("tr-TR")} TL</TableCell>
                    <TableCell>{payout.seller_bank_accounts?.bank_name || "-"}</TableCell>
                    <TableCell>{payout.description}</TableCell>
                    <TableCell>{getStatusBadge(payout.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">Henüz ödeme işlemi bulunmuyor</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ödeme Talebi Oluştur</DialogTitle>
            <DialogDescription>Hesabınıza para çekmek için bir ödeme talebi oluşturun.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Bakiye Bilgisi */}
            {summary && (
              <div className="p-3 bg-gray-100 rounded text-sm flex flex-col gap-1">
                <span><b>Mevcut Bakiyeniz:</b> {summary.netIncome.toLocaleString("tr-TR")} TL</span>
                {newPayout.amount && !isNaN(Number(newPayout.amount)) && (
                  <span><b>Kalan Bakiye (talep sonrası):</b> {(summary.netIncome - Number(newPayout.amount)).toLocaleString("tr-TR")} TL</span>
                )}
              </div>
            )}
            {summary && summary.netIncome <= 0 && (
              <div className="p-2 bg-red-100 text-red-700 rounded text-center font-medium">
                Bakiyeniz yetersiz, ödeme talebi oluşturamazsınız.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="payout-amount">Tutar (TL)</Label>
              <Input
                id="payout-amount"
                type="number"
                min="1"
                step="0.01"
                value={newPayout.amount}
                max={summary ? summary.netIncome : undefined}
                disabled={summary && summary.netIncome <= 0}
                onChange={(e) => {
                  let value = e.target.value
                  if (Number(value) < 0) value = ""
                  setNewPayout({ ...newPayout, amount: value })
                }}
              />
              {summary && Number(newPayout.amount) > summary.netIncome && (
                <div className="text-red-600 text-xs mt-1">Talep edilen tutar mevcut bakiyeden fazla olamaz.</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank-account">Banka Hesabı</Label>
              <Select
                value={useCustomIban ? "custom" : newPayout.bankAccountId}
                disabled={summary && summary.netIncome <= 0}
                onValueChange={(value) => {
                  if (value === "custom") {
                    setUseCustomIban(true)
                    setNewPayout({ ...newPayout, bankAccountId: "", iban: "" })
                  } else {
                    setUseCustomIban(false)
                    setNewPayout({ ...newPayout, bankAccountId: value, iban: "" })
                  }
                }}
              >
                <SelectTrigger id="bank-account">
                  <SelectValue placeholder="Banka hesabı seçin" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.bank_name} - {account.iban.slice(-4)}
                      {account.is_default && " (Varsayılan)"}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Yeni IBAN Gir</SelectItem>
                </SelectContent>
              </Select>
              {useCustomIban && (
                <Input
                  id="custom-iban"
                  placeholder="TR ile başlayan IBAN"
                  value={newPayout.iban}
                  disabled={summary && summary.netIncome <= 0}
                  onChange={e => setNewPayout({ ...newPayout, iban: e.target.value })}
                  maxLength={26}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payout-description">Açıklama</Label>
              <Input
                id="payout-description"
                value={newPayout.description}
                onChange={(e) =>
                  setNewPayout({
                    ...newPayout,
                    description: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>
              İptal
            </Button>
            <Button onClick={() => requestPayout()} disabled={loading || (summary && summary.netIncome <= 0)}>
              {loading ? "İşleniyor..." : "Ödeme Talebi Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
