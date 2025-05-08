"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CreditCard, FileText, Trash2, Plus, BanknoteIcon as BankIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function SellerPaymentSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [invoiceSettings, setInvoiceSettings] = useState<any>(null)
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [paymentIntegrations, setPaymentIntegrations] = useState<any[]>([])

  // Yeni banka hesabı için state
  const [newBankAccount, setNewBankAccount] = useState({
    bankName: "",
    accountHolderName: "",
    iban: "",
    isDefault: false,
  })

  // Fatura ayarları için state
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

  // Ödeme entegrasyonu için state
  const [newIntegration, setNewIntegration] = useState({
    provider: "iyzico",
    apiKey: "",
    apiSecret: "",
    merchantId: "",
    isActive: true,
    settings: {},
  })

  // Yeni payout için state
  const [newPayout, setNewPayout] = useState({ amount: "", bankAccountId: "", description: "Satıcı ödemesi" })
  const [loadingPayout, setLoadingPayout] = useState(false)

  useEffect(() => {
    fetchPaymentSettings()
  }, [])

  const fetchPaymentSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/seller/payment-settings")
      const data = await response.json()

      if (data.success) {
        setInvoiceSettings(data.invoiceSettings)
        setBankAccounts(data.bankAccounts)
        setPaymentIntegrations(data.paymentIntegrations)

        if (data.invoiceSettings) {
          setUpdatedInvoiceSettings({
            isEInvoiceUser: data.invoiceSettings.is_e_invoice_user,
            taxOffice: data.invoiceSettings.tax_office,
            taxNumber: data.invoiceSettings.tax_number,
            companyName: data.invoiceSettings.company_name,
            address: data.invoiceSettings.address,
            phone: data.invoiceSettings.phone,
            email: data.invoiceSettings.email,
            mersis: data.invoiceSettings.mersis,
            gibUsername: data.invoiceSettings.gib_username,
            gibPassword: data.invoiceSettings.gib_password,
            gibApiKey: data.invoiceSettings.gib_api_key,
            autoInvoiceGeneration: data.invoiceSettings.auto_invoice_generation,
            invoicePrefix: data.invoiceSettings.invoice_prefix,
            invoiceNotes: data.invoiceSettings.invoice_notes,
          })
        }
      } else {
        toast({
          title: "Hata",
          description: data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Ödeme ayarları alınırken hata:", error)
      toast({
        title: "Hata",
        description: "Ödeme ayarları alınırken bir hata oluştu",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveInvoiceSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/seller/payment-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "invoice_settings",
          data: updatedInvoiceSettings,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Başarılı",
          description: "Fatura ayarları güncellendi",
        })
        fetchPaymentSettings()
      } else {
        toast({
          title: "Hata",
          description: data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Fatura ayarları kaydedilirken hata:", error)
      toast({
        title: "Hata",
        description: "Fatura ayarları kaydedilirken bir hata oluştu",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const validateIban = (iban: string) => iban.startsWith("TR") && iban.length === 26

  const addBankAccount = async () => {
    if (!newBankAccount.bankName || !newBankAccount.accountHolderName || !newBankAccount.iban) {
      toast({ title: "Hata", description: "Tüm alanları doldurun", variant: "destructive" })
      return
    }
    if (!validateIban(newBankAccount.iban)) {
      toast({ title: "Hata", description: "Geçerli bir IBAN girin (TR ile başlamalı ve 26 karakter olmalı)", variant: "destructive" })
      return
    }
    try {
      setLoading(true)
      const response = await fetch("/api/seller/payment-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "bank_account",
          data: newBankAccount,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Başarılı",
          description: "Banka hesabı eklendi",
        })
        setNewBankAccount({
          bankName: "",
          accountHolderName: "",
          iban: "",
          isDefault: false,
        })
        fetchPaymentSettings()
      } else {
        toast({
          title: "Hata",
          description: data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Banka hesabı eklenirken hata:", error)
      toast({
        title: "Hata",
        description: "Banka hesabı eklenirken bir hata oluştu",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addPaymentIntegration = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/seller/payment-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "payment_integration",
          data: newIntegration,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Başarılı",
          description: "Ödeme entegrasyonu eklendi",
        })
        setNewIntegration({
          provider: "iyzico",
          apiKey: "",
          apiSecret: "",
          merchantId: "",
          isActive: true,
          settings: {},
        })
        fetchPaymentSettings()
      } else {
        toast({
          title: "Hata",
          description: data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Ödeme entegrasyonu eklenirken hata:", error)
      toast({
        title: "Hata",
        description: "Ödeme entegrasyonu eklenirken bir hata oluştu",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteBankAccount = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/seller/bank-accounts/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Başarılı",
          description: "Banka hesabı silindi",
        })
        fetchPaymentSettings()
      } else {
        toast({
          title: "Hata",
          description: data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Banka hesabı silinirken hata:", error)
      toast({
        title: "Hata",
        description: "Banka hesabı silinirken bir hata oluştu",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const requestPayout = async () => {
    if (!newPayout.amount || !newPayout.bankAccountId) {
      toast({
        title: "Hata",
        description: "Tutar ve banka hesabı seçmelisiniz",
        variant: "destructive",
      })
      return
    }
    try {
      setLoadingPayout(true)
      const response = await fetch("/api/seller/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPayout),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Başarılı", description: "Ödeme talebi oluşturuldu" })
        setNewPayout({ amount: "", bankAccountId: "", description: "Satıcı ödemesi" })
      } else {
        toast({ title: "Hata", description: data.message, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Hata", description: "Ödeme talebi oluşturulurken bir hata oluştu", variant: "destructive" })
    } finally {
      setLoadingPayout(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Ödeme ve Fatura Ayarları</h1>
      </div>

      <Tabs defaultValue="invoice">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invoice">
            <FileText className="w-4 h-4 mr-2" />
            Fatura Ayarları
          </TabsTrigger>
          <TabsTrigger value="bank">
            <BankIcon className="w-4 h-4 mr-2" />
            Banka Hesapları
          </TabsTrigger>
          <TabsTrigger value="payment">
            <CreditCard className="w-4 h-4 mr-2" />
            Ödeme Entegrasyonları
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoice" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Fatura Bilgileri</CardTitle>
              <CardDescription>
                Fatura kesimi için gerekli bilgilerinizi ve GİB entegrasyonunuzu yapılandırın.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="e-invoice-user"
                      checked={updatedInvoiceSettings.isEInvoiceUser}
                      onCheckedChange={(checked) =>
                        setUpdatedInvoiceSettings({
                          ...updatedInvoiceSettings,
                          isEInvoiceUser: checked,
                        })
                      }
                    />
                    <Label htmlFor="e-invoice-user">e-Fatura Mükellefiyim</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">e-Fatura mükellefi iseniz bu seçeneği işaretleyin.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto-invoice"
                      checked={updatedInvoiceSettings.autoInvoiceGeneration}
                      onCheckedChange={(checked) =>
                        setUpdatedInvoiceSettings({
                          ...updatedInvoiceSettings,
                          autoInvoiceGeneration: checked,
                        })
                      }
                    />
                    <Label htmlFor="auto-invoice">Otomatik Fatura Oluştur</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Siparişler tamamlandığında otomatik fatura oluşturulur.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Şirket Adı</Label>
                  <Input
                    id="company-name"
                    value={updatedInvoiceSettings.companyName}
                    onChange={(e) =>
                      setUpdatedInvoiceSettings({
                        ...updatedInvoiceSettings,
                        companyName: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax-number">Vergi Numarası</Label>
                  <Input
                    id="tax-number"
                    value={updatedInvoiceSettings.taxNumber}
                    onChange={(e) =>
                      setUpdatedInvoiceSettings({
                        ...updatedInvoiceSettings,
                        taxNumber: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax-office">Vergi Dairesi</Label>
                  <Input
                    id="tax-office"
                    value={updatedInvoiceSettings.taxOffice}
                    onChange={(e) =>
                      setUpdatedInvoiceSettings({
                        ...updatedInvoiceSettings,
                        taxOffice: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mersis">MERSİS No</Label>
                  <Input
                    id="mersis"
                    value={updatedInvoiceSettings.mersis}
                    onChange={(e) =>
                      setUpdatedInvoiceSettings({
                        ...updatedInvoiceSettings,
                        mersis: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Adres</Label>
                  <Input
                    id="address"
                    value={updatedInvoiceSettings.address}
                    onChange={(e) =>
                      setUpdatedInvoiceSettings({
                        ...updatedInvoiceSettings,
                        address: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={updatedInvoiceSettings.phone}
                    onChange={(e) =>
                      setUpdatedInvoiceSettings({
                        ...updatedInvoiceSettings,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <Input
                    id="email"
                    value={updatedInvoiceSettings.email}
                    onChange={(e) =>
                      setUpdatedInvoiceSettings({
                        ...updatedInvoiceSettings,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="text-lg font-medium">GİB Entegrasyonu</h3>
                <p className="text-sm text-muted-foreground">
                  Gelir İdaresi Başkanlığı e-Arşiv/e-Fatura sistemi entegrasyonu için gerekli bilgiler.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gib-username">GİB Kullanıcı Adı</Label>
                  <Input
                    id="gib-username"
                    value={updatedInvoiceSettings.gibUsername}
                    onChange={(e) =>
                      setUpdatedInvoiceSettings({
                        ...updatedInvoiceSettings,
                        gibUsername: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gib-password">GİB Şifre</Label>
                  <Input
                    id="gib-password"
                    type="password"
                    value={updatedInvoiceSettings.gibPassword}
                    onChange={(e) =>
                      setUpdatedInvoiceSettings({
                        ...updatedInvoiceSettings,
                        gibPassword: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="gib-api-key">GİB API Anahtarı</Label>
                  <Input
                    id="gib-api-key"
                    value={updatedInvoiceSettings.gibApiKey}
                    onChange={(e) =>
                      setUpdatedInvoiceSettings({
                        ...updatedInvoiceSettings,
                        gibApiKey: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice-prefix">Fatura Öneki</Label>
                  <Input
                    id="invoice-prefix"
                    value={updatedInvoiceSettings.invoicePrefix}
                    onChange={(e) =>
                      setUpdatedInvoiceSettings({
                        ...updatedInvoiceSettings,
                        invoicePrefix: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Fatura numaralarının başına eklenecek ön ek (örn: INV, FTR)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice-notes">Fatura Notları</Label>
                  <Input
                    id="invoice-notes"
                    value={updatedInvoiceSettings.invoiceNotes}
                    onChange={(e) =>
                      setUpdatedInvoiceSettings({
                        ...updatedInvoiceSettings,
                        invoiceNotes: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Tüm faturalara eklenecek standart notlar</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={saveInvoiceSettings} disabled={loading}>
                {loading ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="bank" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Banka Hesapları</CardTitle>
              <CardDescription>Ödemelerin aktarılacağı banka hesaplarınızı yönetin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {bankAccounts.length > 0 ? (
                <div className="space-y-4">
                  {bankAccounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">{account.bank_name}</div>
                        <div className="text-sm text-muted-foreground">{account.account_holder_name}</div>
                        <div className="text-sm">{account.iban}</div>
                        {account.is_default && (
                          <div className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full inline-block mt-1">
                            Varsayılan
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteBankAccount(account.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Banka hesabı bulunamadı</AlertTitle>
                  <AlertDescription>
                    Henüz bir banka hesabı eklemediniz. Ödemeleri alabilmek için en az bir banka hesabı eklemelisiniz.
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Yeni Banka Hesabı Ekle</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank-name">Banka Adı</Label>
                  <Input
                    id="bank-name"
                    value={newBankAccount.bankName}
                    onChange={(e) =>
                      setNewBankAccount({
                        ...newBankAccount,
                        bankName: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account-holder">Hesap Sahibi</Label>
                  <Input
                    id="account-holder"
                    value={newBankAccount.accountHolderName}
                    onChange={(e) =>
                      setNewBankAccount({
                        ...newBankAccount,
                        accountHolderName: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    value={newBankAccount.iban}
                    onChange={(e) =>
                      setNewBankAccount({
                        ...newBankAccount,
                        iban: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="default-account"
                      checked={newBankAccount.isDefault}
                      onCheckedChange={(checked) =>
                        setNewBankAccount({
                          ...newBankAccount,
                          isDefault: checked,
                        })
                      }
                    />
                    <Label htmlFor="default-account">Varsayılan hesap olarak ayarla</Label>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={addBankAccount} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                {loading ? "Ekleniyor..." : "Hesap Ekle"}
              </Button>
            </CardFooter>
          </Card>

          {/* Ödeme Talebi Oluşturma Kartı */}
          <Card>
            <CardHeader>
              <CardTitle>Ödeme Talebi Oluştur</CardTitle>
              <CardDescription>Hesabınıza para çekmek için bir ödeme talebi oluşturun.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payout-amount">Tutar (TL)</Label>
                <Input
                  id="payout-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={newPayout.amount}
                  onChange={e => setNewPayout({ ...newPayout, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-account">Banka Hesabı</Label>
                {bankAccounts.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-red-500">Ödeme talebi oluşturabilmek için önce bir banka hesabı eklemelisiniz.</p>
                    <Button onClick={() => router.push('/seller/payment-settings?tab=bank')}>Banka Hesabı Ekle</Button>
                  </div>
                ) : (
                  <select
                    id="bank-account"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newPayout.bankAccountId}
                    onChange={e => setNewPayout({ ...newPayout, bankAccountId: e.target.value })}
                  >
                    <option value="">Banka hesabı seçin</option>
                    {bankAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.bank_name} - {account.iban.slice(-4)}{account.is_default ? " (Varsayılan)" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={requestPayout} disabled={loadingPayout}>
                {loadingPayout ? "İşleniyor..." : "Ödeme Talebi Oluştur"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ödeme Entegrasyonları</CardTitle>
              <CardDescription>Ödeme almak için kullanacağınız ödeme sağlayıcılarını yapılandırın.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentIntegrations.length > 0 ? (
                <div className="space-y-4">
                  {paymentIntegrations.map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium capitalize">{integration.provider}</div>
                        <div className="text-sm text-muted-foreground">Merchant ID: {integration.merchant_id}</div>
                        <div className="text-sm">API Key: ••••••••{integration.api_key.slice(-4)}</div>
                        {integration.is_active ? (
                          <div className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full inline-block mt-1">
                            Aktif
                          </div>
                        ) : (
                          <div className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full inline-block mt-1">
                            Pasif
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          // Entegrasyon düzenleme fonksiyonu
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Ödeme entegrasyonu bulunamadı</AlertTitle>
                  <AlertDescription>
                    Henüz bir ödeme entegrasyonu eklemediniz. Ödemeleri işleyebilmek için en az bir ödeme sağlayıcısı
                    entegrasyonu eklemelisiniz.
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Yeni Ödeme Entegrasyonu Ekle</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="provider">Ödeme Sağlayıcı</Label>
                  <select
                    id="provider"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newIntegration.provider}
                    onChange={(e) =>
                      setNewIntegration({
                        ...newIntegration,
                        provider: e.target.value,
                      })
                    }
                  >
                    <option value="iyzico">iyzico</option>
                    <option value="paytr">PayTR</option>
                    <option value="payu">PayU</option>
                    <option value="gpay">Garanti Pay</option>
                    <option value="akbank">Akbank Sanal POS</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="merchant-id">Merchant ID</Label>
                  <Input
                    id="merchant-id"
                    value={newIntegration.merchantId}
                    onChange={(e) =>
                      setNewIntegration({
                        ...newIntegration,
                        merchantId: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">API Anahtarı</Label>
                  <Input
                    id="api-key"
                    value={newIntegration.apiKey}
                    onChange={(e) =>
                      setNewIntegration({
                        ...newIntegration,
                        apiKey: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="api-secret">API Secret</Label>
                  <Input
                    id="api-secret"
                    type="password"
                    value={newIntegration.apiSecret}
                    onChange={(e) =>
                      setNewIntegration({
                        ...newIntegration,
                        apiSecret: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active-integration"
                      checked={newIntegration.isActive}
                      onCheckedChange={(checked) =>
                        setNewIntegration({
                          ...newIntegration,
                          isActive: checked,
                        })
                      }
                    />
                    <Label htmlFor="active-integration">Entegrasyonu aktif et</Label>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={addPaymentIntegration} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                {loading ? "Ekleniyor..." : "Entegrasyon Ekle"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
