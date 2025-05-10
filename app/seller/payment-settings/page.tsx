"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CreditCard, FileText, Trash2, Plus, BanknoteIcon as BankIcon, PlusCircle, Edit, CheckCircle, XCircle, TrendingUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/types/supabase"

export const dynamic = "force-dynamic"

type SellerBankAccount = Database["public"]["Tables"]["seller_bank_accounts"]["Row"]

export default function SellerPaymentSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("invoice")

  // Fatura Ayarları State'leri
  const [invoiceSettings, setInvoiceSettings] = useState<any>(null)
  const [updatedInvoiceSettings, setUpdatedInvoiceSettings] = useState<any>({
    isEInvoiceUser: false,
    taxOffice: "",
    taxNumber: "",
    companyName: "",
    address: "",
    phone: "",
    email: "",
    mersis: "",
    gibUsername: "",
    gibPassword: "",
    gibApiKey: "",
    autoInvoiceGeneration: true,
    invoicePrefix: "INV",
    invoiceNotes: "",
  })
  const [invoiceLoading, setInvoiceLoading] = useState(false)

  // Banka Hesapları State'leri
  const [bankAccounts, setBankAccounts] = useState<SellerBankAccount[]>([])
  const [newBankAccount, setNewBankAccount] = useState({
    bankName: "",
    accountHolderName: "",
    iban: "",
    isDefault: false,
    currency: "TRY",
    account_number: "",
    branch_code: "",
    swift_bic_code: "",
    instructions: ""
  })
  const [bankAccountLoading, setBankAccountLoading] = useState(false)

  // Ödeme Entegrasyonları State'leri
  const [paymentIntegrations, setPaymentIntegrations] = useState<any[]>([])
  const [newIntegration, setNewIntegration] = useState({
    provider: "iyzico",
    apiKey: "",
    apiSecret: "",
    merchantId: "",
    isActive: true,
    settings: {},
  })
  const [integrationLoading, setIntegrationLoading] = useState(false)

  // Payout State'leri
  const [currentBalance, setCurrentBalance] = useState<number>(0)
  const [newPayout, setNewPayout] = useState({ amount: "", bankAccountId: "", description: "Satıcı ödemesi" })
  const [loadingPayout, setLoadingPayout] = useState(false)

  useEffect(() => {
    fetchPaymentSettings()
  }, [])

  const fetchPaymentSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/seller/payment-settings")
      const data = await response.json()

      if (data.success) {
        // Fatura Ayarları
        setInvoiceSettings(data.invoiceSettings)
        if (data.invoiceSettings) {
          setUpdatedInvoiceSettings({
            isEInvoiceUser: data.invoiceSettings.is_e_invoice_user ?? false,
            taxOffice: data.invoiceSettings.tax_office ?? "",
            taxNumber: data.invoiceSettings.tax_number ?? "",
            companyName: data.invoiceSettings.company_name ?? "",
            address: data.invoiceSettings.address ?? "",
            phone: data.invoiceSettings.phone ?? "",
            email: data.invoiceSettings.email ?? "",
            mersis: data.invoiceSettings.mersis ?? "",
            gibUsername: data.invoiceSettings.gib_username ?? "",
            gibPassword: "",
            gibApiKey: data.invoiceSettings.gib_api_key ?? "",
            autoInvoiceGeneration: data.invoiceSettings.auto_invoice_generation ?? true,
            invoicePrefix: data.invoiceSettings.invoice_prefix ?? "INV",
            invoiceNotes: data.invoiceSettings.invoice_notes ?? "",
          })
        }
        // Banka Hesapları
        setBankAccounts(data.bankAccounts || [])
        // Ödeme Entegrasyonları
        setPaymentIntegrations(data.paymentIntegrations || [])
        // Satıcı bakiyesi için state
        setCurrentBalance(data.currentBalance || 0)
      } else {
        toast({
          title: "Hata",
          description: data.message || "Ödeme ayarları alınamadı.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Ödeme ayarları alınırken hata:", error)
      toast({
        title: "Hata",
        description: "Ödeme ayarları alınırken bir istemci tarafı hatası oluştu.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveInvoiceSettings = async () => {
    setInvoiceLoading(true)
    try {
      const response = await fetch("/api/seller/payment-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "invoice_settings", data: updatedInvoiceSettings }),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Başarılı", description: "Fatura ayarları güncellendi" })
        fetchPaymentSettings()
      } else {
        toast({ title: "Hata", description: data.message, variant: "destructive" })
      }
    } catch (error) {
      console.error("Fatura ayarları kaydedilirken hata:", error)
      toast({ title: "Hata", description: "Fatura ayarları kaydedilirken bir hata oluştu", variant: "destructive" })
    } finally {
      setInvoiceLoading(false)
    }
  }

  const validateIban = (iban: string) => typeof iban === 'string' && iban.startsWith("TR") && iban.length === 26

  const handleAddBankAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newBankAccount.bankName || !newBankAccount.accountHolderName || !newBankAccount.iban) {
      toast({ title: "Eksik Bilgi", description: "Banka adı, hesap sahibi ve IBAN alanları zorunludur.", variant: "destructive" })
      return
    }
    if (!validateIban(newBankAccount.iban)) {
      toast({ title: "Geçersiz IBAN", description: "Lütfen geçerli bir TR IBAN girin (26 karakter).", variant: "destructive" })
      return
    }
    setBankAccountLoading(true)
    try {
      const response = await fetch("/api/seller/payment-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "bank_account", data: newBankAccount }),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Başarılı", description: "Banka hesabı eklendi" })
        setNewBankAccount({ bankName: "", accountHolderName: "", iban: "", isDefault: false, currency: "TRY", account_number: "", branch_code: "", swift_bic_code: "", instructions: "" })
        fetchPaymentSettings()
      } else {
        toast({ title: "Hata", description: data.message || "Banka hesabı eklenemedi.", variant: "destructive" })
      }
    } catch (error) {
      console.error("Banka hesabı eklenirken hata:", error)
      toast({ title: "Hata", description: "Banka hesabı eklenirken bir hata oluştu.", variant: "destructive" })
    } finally {
      setBankAccountLoading(false)
    }
  }

  const handleDeleteBankAccount = async (id: string) => {
    if (!confirm("Bu banka hesabını silmek istediğinizden emin misiniz?")) return
    setBankAccountLoading(true)
    try {
      const response = await fetch(`/api/seller/bank-accounts/${id}`, { method: "DELETE" })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Başarılı", description: "Banka hesabı silindi" })
        fetchPaymentSettings()
      } else {
        toast({ title: "Hata", description: data.message || "Banka hesabı silinemedi.", variant: "destructive" })
      }
    } catch (error) {
      console.error("Banka hesabı silinirken hata:", error)
      toast({ title: "Hata", description: "Banka hesabı silinirken bir hata oluştu.", variant: "destructive" })
    } finally {
      setBankAccountLoading(false)
    }
  }

  const addPaymentIntegration = async () => {
    setIntegrationLoading(true)
    try {
      const response = await fetch("/api/seller/payment-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "payment_integration", data: newIntegration }),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Başarılı", description: "Ödeme entegrasyonu eklendi" })
        setNewIntegration({ provider: "iyzico", apiKey: "", apiSecret: "", merchantId: "", isActive: true, settings: {} })
        fetchPaymentSettings()
      } else {
        toast({ title: "Hata", description: data.message || "Entegrasyon eklenemedi.", variant: "destructive" })
      }
    } catch (error) {
      console.error("Ödeme entegrasyonu eklenirken hata:", error)
      toast({ title: "Hata", description: "Ödeme entegrasyonu eklenirken bir hata oluştu.", variant: "destructive" })
    } finally {
      setIntegrationLoading(false)
    }
  }

  const requestPayout = async () => {
    const amountToRequest = parseFloat(newPayout.amount)
    if (isNaN(amountToRequest) || amountToRequest <= 0) {
      toast({ title: "Geçersiz Tutar", description: "Lütfen geçerli bir tutar girin.", variant: "destructive" })
      return
    }
    if (amountToRequest > currentBalance) {
      toast({ title: "Yetersiz Bakiye", description: `Çekmek istediğiniz tutar (${amountToRequest.toFixed(2)} TRY) mevcut bakiyenizden (${currentBalance.toFixed(2)} TRY) fazla olamaz.`, variant: "destructive" })
      return
    }
    if (!newPayout.bankAccountId) {
      toast({ title: "Banka Hesabı Seçilmedi", description: "Lütfen ödeme yapılacak bir banka hesabı seçin.", variant: "destructive" })
      return
    }

    setLoadingPayout(true)
    try {
      const response = await fetch("/api/seller/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPayout),
      })
      const data = await response.json()

      if (data.success) {
        toast({ title: "Başarılı", description: "Ödeme talebi oluşturuldu. Talebiniz inceleniyor." })
        setNewPayout({ amount: "", bankAccountId: "", description: "Satıcı ödemesi" })
        fetchPaymentSettings()
      } else {
        toast({ title: "Hata", description: data.message || "Ödeme talebi oluşturulamadı.", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Hata", description: error.message || "Ödeme talebi oluşturulurken bir hata oluştu.", variant: "destructive" })
    } finally {
      setLoadingPayout(false)
    }
  }

  if (loading && !bankAccounts.length && currentBalance === 0) {
    return <div className="container py-10 text-center">Ayarlar yükleniyor...</div>
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invoice">Fatura Ayarları</TabsTrigger>
          <TabsTrigger value="bank">Banka Hesapları</TabsTrigger>
          <TabsTrigger value="payment">Ödeme Entegrasyonları</TabsTrigger>
          <TabsTrigger value="payout">Ödeme Talebi</TabsTrigger>
        </TabsList>

        <TabsContent value="invoice" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Fatura Bilgileri</CardTitle>
              <CardDescription>Fatura kesimi için gerekli bilgilerinizi yapılandırın.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="e-invoice-user" checked={updatedInvoiceSettings.isEInvoiceUser} onCheckedChange={(checked) => setUpdatedInvoiceSettings({ ...updatedInvoiceSettings, isEInvoiceUser: checked })} />
                    <Label htmlFor="e-invoice-user">e-Fatura Mükellefiyim</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-name">Şirket Adı</Label>
                  <Input id="company-name" value={updatedInvoiceSettings.companyName} onChange={(e) => setUpdatedInvoiceSettings({ ...updatedInvoiceSettings, companyName: e.target.value })} />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={saveInvoiceSettings} disabled={invoiceLoading}>
                {invoiceLoading ? "Kaydediliyor..." : "Fatura Ayarlarını Kaydet"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="bank" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Yeni Banka Hesabı Ekle</CardTitle>
            </CardHeader>
            <form onSubmit={handleAddBankAccount}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="bankName">Banka Adı</Label>
                    <Input id="bankName" value={newBankAccount.bankName} onChange={(e) => setNewBankAccount({ ...newBankAccount, bankName: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="accountHolderName">Hesap Sahibi Adı</Label>
                    <Input id="accountHolderName" value={newBankAccount.accountHolderName} onChange={(e) => setNewBankAccount({ ...newBankAccount, accountHolderName: e.target.value })} required />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="iban">IBAN (TR ile başlamalı, 26 karakter)</Label>
                    <Input id="iban" value={newBankAccount.iban} onChange={(e) => setNewBankAccount({ ...newBankAccount, iban: e.target.value.toUpperCase() })} required maxLength={26} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="accountNumber">Hesap Numarası (Opsiyonel)</Label>
                    <Input id="accountNumber" value={newBankAccount.account_number} onChange={(e) => setNewBankAccount({ ...newBankAccount, account_number: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="branchCode">Şube Kodu (Opsiyonel)</Label>
                    <Input id="branchCode" value={newBankAccount.branch_code} onChange={(e) => setNewBankAccount({ ...newBankAccount, branch_code: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="swiftBicCode">SWIFT/BIC (Opsiyonel)</Label>
                    <Input id="swiftBicCode" value={newBankAccount.swift_bic_code} onChange={(e) => setNewBankAccount({ ...newBankAccount, swift_bic_code: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="currency">Para Birimi</Label>
                    <Input id="currency" value={newBankAccount.currency} onChange={(e) => setNewBankAccount({ ...newBankAccount, currency: e.target.value.toUpperCase() })} required />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="instructions">Talimatlar (Opsiyonel)</Label>
                    <Input id="instructions" value={newBankAccount.instructions} onChange={(e) => setNewBankAccount({ ...newBankAccount, instructions: e.target.value })} placeholder="Örn: Açıklamaya X yazınız" />
                  </div>
                  <div className="flex items-center space-x-2 md:col-span-2">
                    <Switch id="isDefault" checked={newBankAccount.isDefault} onCheckedChange={(checked) => setNewBankAccount({ ...newBankAccount, isDefault: checked })} />
                    <Label htmlFor="isDefault">Varsayılan hesap olarak ayarla</Label>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={bankAccountLoading}>
                  {bankAccountLoading ? "Ekleniyor..." : "Banka Hesabını Ekle"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kayıtlı Banka Hesaplarım</CardTitle>
            </CardHeader>
            <CardContent>
              {bankAccounts && bankAccounts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Banka Adı</TableHead>
                      <TableHead>Hesap Sahibi</TableHead>
                      <TableHead>IBAN</TableHead>
                      <TableHead>Varsayılan</TableHead>
                      <TableHead>Doğrulanma</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>{account.bank_name}</TableCell>
                        <TableCell>{account.account_holder_name}</TableCell>
                        <TableCell>{account.iban}</TableCell>
                        <TableCell>
                          {account.is_default ? (
                            <Badge className="bg-blue-500 text-white">Evet</Badge>
                          ) : (
                            <Button variant="outline" size="sm" disabled>Ayarla</Button>
                          )}
                        </TableCell>
                        <TableCell>
                          {account.is_verified ? (
                            <Badge className="bg-green-500 text-white">Doğrulandı</Badge>
                          ) : (
                            <Badge variant="secondary">Beklemede</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" asChild className="mr-2" title="Düzenle">
                            <span><Edit className="h-4 w-4" /></span>
                          </Button>
                          <Button variant="ghost" size="icon" title="Sil" onClick={() => handleDeleteBankAccount(account.id)} disabled={bankAccountLoading}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                !loading && <p className="text-center text-muted-foreground py-4">Kayıtlı banka hesabınız bulunmuyor.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ödeme Entegrasyonları</CardTitle>
              <CardDescription>Ödeme almak için kullanacağınız ödeme sağlayıcılarını yapılandırın.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">Yakında...</p>
            </CardContent>
            <CardFooter>
              <Button disabled>
                {integrationLoading ? "Ekleniyor..." : "Entegrasyon Ekle"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="payout" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ödeme Talebi Oluştur</CardTitle>
              <CardDescription>Birikmiş hak edişlerinizi çekmek için talepte bulunun.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-blue-700 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" /> Çekilebilir Bakiye
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-700">{currentBalance.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}</p>
                  <p className="text-xs text-blue-600 mt-1">Bu bakiye, onay bekleyen talepleriniz düşülmeden önceki brüt bakiyenizdir.</p>
                </CardContent>
              </Card>

              <form onSubmit={(e) => { e.preventDefault(); requestPayout(); }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="payoutAmount">Çekilecek Tutar (TRY)</Label>
                    <Input
                      id="payoutAmount"
                      type="number"
                      value={newPayout.amount}
                      onChange={(e) => setNewPayout({ ...newPayout, amount: e.target.value })}
                      placeholder="0.00"
                      required
                      min="1"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label htmlFor="payoutBankAccount">Banka Hesabı</Label>
                    <select
                      id="payoutBankAccount"
                      value={newPayout.bankAccountId}
                      onChange={(e) => setNewPayout({ ...newPayout, bankAccountId: e.target.value })}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-focus file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Banka hesabı seçin...</option>
                      {bankAccounts.filter(acc => acc.is_verified).map(account => (
                        <option key={account.id} value={account.id}>
                          {account.bank_name} - IBAN: ...{account.iban.slice(-4)} {account.is_default ? "(Varsayılan)" : ""}
                        </option>
                      ))}
                    </select>
                    {bankAccounts.filter(acc => acc.is_verified).length === 0 &&
                      <p className="text-sm text-red-500 pt-1">Ödeme talebi için doğrulanmış banka hesabınız bulunmuyor. Lütfen "Banka Hesapları" sekmesinden bir hesap ekleyin ve doğrulamasını bekleyin.</p>}
                  </div>
                  <div>
                    <Label htmlFor="payoutDescription">Açıklama (Ödeme Referansı İçin)</Label>
                    <Input
                      id="payoutDescription"
                      value={newPayout.description}
                      onChange={(e) => setNewPayout({ ...newPayout, description: e.target.value })}
                      placeholder="Örn: Ağustos 2024 Hak Edişi"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loadingPayout || bankAccounts.filter(acc => acc.is_verified).length === 0 || parseFloat(newPayout.amount || "0") <= 0 || parseFloat(newPayout.amount || "0") > currentBalance}>
                    {loadingPayout ? "Talep Gönderiliyor..." : "Ödeme Talebini Gönder"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
