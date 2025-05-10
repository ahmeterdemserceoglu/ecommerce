"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Database, ShieldCheck, Table2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AdminLayout from "@/components/admin/AdminLayout"

export default function PaymentSystemPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const updatePaymentSystem = async () => {
    try {
      setLoading(true)
      setResult(null)

      const response = await fetch("/api/admin/update-payment-system", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Ödeme sistemi güncellenirken bir hata oluştu")
      }

      setResult({
        success: true,
        message: data.message || "Ödeme sistemi başarıyla güncellendi",
      })
    } catch (error: any) {
      console.error("Ödeme sistemi güncellenirken hata:", error)
      setResult({
        success: false,
        message: error.message || "Ödeme sistemi güncellenirken bir hata oluştu",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Ödeme Sistemi Yönetimi</h1>

        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="tables">Tablolar</TabsTrigger>
            <TabsTrigger value="permissions">İzinler ve Politikalar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Ödeme Sistemi Güncelleme
                </CardTitle>
                <CardDescription>
                  Bu işlem, ödeme sistemi için gerekli tüm tabloları, ilişkileri, indeksleri, izinleri ve politikaları
                  oluşturur veya günceller.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  Ödeme sistemi tablolarını ve yapılandırmasını güncellemek için aşağıdaki butona tıklayın. Bu işlem:
                </p>
                <ul className="list-disc pl-5 mb-4 space-y-1">
                  <li>Tüm ödeme tablolarını oluşturur veya günceller</li>
                  <li>Gerekli indeksleri ekler</li>
                  <li>Tetikleyicileri ve fonksiyonları oluşturur</li>
                  <li>Row Level Security (RLS) politikalarını ayarlar</li>
                  <li>Örnek verileri ekler (eğer yoksa)</li>
                  <li>Tablo izinlerini yapılandırır</li>
                </ul>

                {result && (
                  <Alert variant={result.success ? "default" : "destructive"} className="mb-4">
                    {result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <AlertTitle>{result.success ? "Başarılı" : "Hata"}</AlertTitle>
                    <AlertDescription>{result.message}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={updatePaymentSystem} disabled={loading}>
                  {loading ? "Güncelleniyor..." : "Ödeme Sistemini Güncelle"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="tables">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Table2 className="h-5 w-5" />
                  Ödeme Sistemi Tabloları
                </CardTitle>
                <CardDescription>Ödeme sistemi için oluşturulan tablolar ve açıklamaları</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">payment_methods</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Ödeme yöntemlerini saklar (Kredi Kartı, Havale, vb.)
                    </p>
                    <div className="bg-muted p-3 rounded-md text-xs overflow-auto">
                      <pre>
                        id, type, name, description, logo, is_active, is_default, display_order, created_at, updated_at
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">banks</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Banka bilgilerini ve desteklenen kart tiplerini saklar
                    </p>
                    <div className="bg-muted p-3 rounded-md text-xs overflow-auto">
                      <pre>
                        id, name, logo, supported_card_types, installment_options, pos_api_endpoint, pos_api_key,
                        pos_api_secret, is_active, created_at, updated_at
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">card_tokens</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Kullanıcıların kayıtlı kart bilgilerini güvenli şekilde saklar
                    </p>
                    <div className="bg-muted p-3 rounded-md text-xs overflow-auto">
                      <pre>
                        id, user_id, card_holder_name, last_four_digits, expiry_month, expiry_year, card_type, bank_id,
                        token_value, is_default, created_at, updated_at
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">payment_transactions</h3>
                    <p className="text-sm text-muted-foreground mb-2">Tüm ödeme işlemlerini saklar</p>
                    <div className="bg-muted p-3 rounded-md text-xs overflow-auto">
                      <pre>
                        id, order_id, store_id, seller_id, amount, currency, status, payment_method, payment_provider,
                        bank_id, installment_count, card_last_four, transaction_id, provider_response, error_code,
                        error_message, is_3d_secure, refunded_amount, created_at, updated_at, completed_at
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">refunds</h3>
                    <p className="text-sm text-muted-foreground mb-2">İade işlemlerini saklar</p>
                    <div className="bg-muted p-3 rounded-md text-xs overflow-auto">
                      <pre>
                        id, transaction_id, order_id, amount, reason, status, requested_by, processed_by,
                        provider_response, error_message, created_at, updated_at, completed_at
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">payment_integrations</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Satıcıların ödeme entegrasyonlarını saklar (iyzico, paytr, stripe)
                    </p>
                    <div className="bg-muted p-3 rounded-md text-xs overflow-auto">
                      <pre>id, store_id, provider, config, is_active, created_at, updated_at</pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">seller_bank_accounts</h3>
                    <p className="text-sm text-muted-foreground mb-2">Satıcıların banka hesap bilgilerini saklar</p>
                    <div className="bg-muted p-3 rounded-md text-xs overflow-auto">
                      <pre>
                        id, seller_id, bank_name, account_holder_name, iban, branch_code, account_number, swift_code,
                        tax_id, is_default, is_verified, verification_date, created_at, updated_at
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">seller_payout_transactions</h3>
                    <p className="text-sm text-muted-foreground mb-2">Satıcılara yapılan ödemeleri saklar</p>
                    <div className="bg-muted p-3 rounded-md text-xs overflow-auto">
                      <pre>
                        id, seller_id, store_id, amount, currency, status, payment_method, bank_account_id,
                        transaction_id, error_message, description, created_at, completed_at
                      </pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  İzinler ve Politikalar
                </CardTitle>
                <CardDescription>
                  Ödeme sistemi için oluşturulan izinler ve Row Level Security (RLS) politikaları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Kullanıcı İzinleri</h3>
                    <p className="text-sm text-muted-foreground mb-2">Kullanıcılar sadece kendi verilerine erişebilir</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>Kullanıcılar kendi kartlarını görüntüleyebilir, ekleyebilir, güncelleyebilir ve silebilir</li>
                      <li>Kullanıcılar kendi ödeme işlemlerini görüntüleyebilir</li>
                      <li>Kullanıcılar kendi iadelerini görüntüleyebilir</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">Satıcı İzinleri</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Satıcılar kendi mağazalarına ait verilere erişebilir
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>Satıcılar kendi mağazalarının ödeme işlemlerini görüntüleyebilir</li>
                      <li>Satıcılar kendi mağazalarının iadelerini görüntüleyebilir</li>
                      <li>Satıcılar kendi ödeme entegrasyonlarını görüntüleyebilir, ekleyebilir ve güncelleyebilir</li>
                      <li>
                        Satıcılar kendi banka hesaplarını görüntüleyebilir, ekleyebilir, güncelleyebilir ve silebilir
                      </li>
                      <li>Satıcılar kendilerine yapılan ödemeleri görüntüleyebilir</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">Admin İzinleri</h3>
                    <p className="text-sm text-muted-foreground mb-2">Adminler tüm verilere erişebilir ve yönetebilir</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>Adminler tüm ödeme yöntemlerini yönetebilir</li>
                      <li>Adminler tüm bankaları yönetebilir</li>
                      <li>Adminler tüm kart tokenlarını görüntüleyebilir</li>
                      <li>Adminler tüm ödeme işlemlerini yönetebilir</li>
                      <li>Adminler tüm iadeleri yönetebilir</li>
                      <li>Adminler tüm ödeme entegrasyonlarını yönetebilir</li>
                      <li>Adminler tüm satıcı banka hesaplarını yönetebilir</li>
                      <li>Adminler tüm satıcı ödeme işlemlerini yönetebilir</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">Tetikleyiciler ve Otomatik İşlemler</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Sistem tarafından otomatik olarak gerçekleştirilen işlemler
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>Varsayılan kart güncellendiğinde diğer kartlar otomatik olarak güncellenir</li>
                      <li>İlk eklenen kart otomatik olarak varsayılan kart olarak işaretlenir</li>
                      <li>Varsayılan banka hesabı güncellendiğinde diğer hesaplar otomatik olarak güncellenir</li>
                      <li>Ödeme işlemi tamamlandığında sipariş durumu otomatik olarak güncellenir</li>
                      <li>İade işlemi tamamlandığında ödeme işlemi ve sipariş durumu otomatik olarak güncellenir</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
