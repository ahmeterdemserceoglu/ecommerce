"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Download, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function SellerTaxReportsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<any>(null)
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString())

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())
  const months = [
    { value: "1", label: "Ocak" },
    { value: "2", label: "Şubat" },
    { value: "3", label: "Mart" },
    { value: "4", label: "Nisan" },
    { value: "5", label: "Mayıs" },
    { value: "6", label: "Haziran" },
    { value: "7", label: "Temmuz" },
    { value: "8", label: "Ağustos" },
    { value: "9", label: "Eylül" },
    { value: "10", label: "Ekim" },
    { value: "11", label: "Kasım" },
    { value: "12", label: "Aralık" },
  ]

  useEffect(() => {
    fetchTaxReport()
  }, [year, month])

  const fetchTaxReport = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tax/report?year=${year}&month=${month}`)
      const data = await response.json()

      if (data.success) {
        setReport(data.report)
      } else {
        toast({
          title: "Hata",
          description: data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Vergi raporu alınırken hata:", error)
      toast({
        title: "Hata",
        description: "Vergi raporu alınırken bir hata oluştu",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadReport = () => {
    // PDF indirme fonksiyonu
    toast({
      title: "Bilgi",
      description: "Rapor indirme özelliği yakında eklenecektir.",
    })
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Vergi Raporları</h1>
        <Button onClick={downloadReport}>
          <Download className="w-4 h-4 mr-2" />
          Raporu İndir
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dönem Seçin</CardTitle>
          <CardDescription>Vergi raporunu görüntülemek istediğiniz dönemi seçin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/2">
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Yıl seçin" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-1/2">
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Ay seçin" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {report && (
        <Tabs defaultValue="summary">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary">
              <Calendar className="w-4 h-4 mr-2" />
              Özet
            </TabsTrigger>
            <TabsTrigger value="details">
              <FileText className="w-4 h-4 mr-2" />
              Detaylar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Satış</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{report.totalSales.toLocaleString("tr-TR")} TL</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Vergilendirilebilir Gelir</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{report.taxableIncome.toLocaleString("tr-TR")} TL</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Toplanan Vergiler</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(
                      report.totalTaxCollected.KDV +
                      report.totalTaxCollected.STOPAJ +
                      report.totalTaxCollected.GELIR_VERGISI +
                      report.totalTaxCollected.MUHTASAR
                    ).toLocaleString("tr-TR")}{" "}
                    TL
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Net Gelir</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{report.netIncome.toLocaleString("tr-TR")} TL</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Vergi Dağılımı</CardTitle>
                <CardDescription>Dönem içinde toplanan vergilerin dağılımı</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vergi Türü</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>KDV</TableCell>
                      <TableCell className="text-right">
                        {report.totalTaxCollected.KDV.toLocaleString("tr-TR")} TL
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Stopaj</TableCell>
                      <TableCell className="text-right">
                        {report.totalTaxCollected.STOPAJ.toLocaleString("tr-TR")} TL
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Gelir Vergisi</TableCell>
                      <TableCell className="text-right">
                        {report.totalTaxCollected.GELIR_VERGISI.toLocaleString("tr-TR")} TL
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Muhtasar</TableCell>
                      <TableCell className="text-right">
                        {report.totalTaxCollected.MUHTASAR.toLocaleString("tr-TR")} TL
                      </TableCell>
                    </TableRow>
                    <TableRow className="font-bold">
                      <TableCell>Toplam</TableCell>
                      <TableCell className="text-right">
                        {(
                          report.totalTaxCollected.KDV +
                          report.totalTaxCollected.STOPAJ +
                          report.totalTaxCollected.GELIR_VERGISI +
                          report.totalTaxCollected.MUHTASAR
                        ).toLocaleString("tr-TR")}{" "}
                        TL
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Vergi Hesaplama Detayları</CardTitle>
                <CardDescription>Vergi hesaplamalarının detaylı açıklaması</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">KDV Hesaplaması</h3>
                  <p className="text-sm text-muted-foreground">
                    KDV, satış tutarı üzerinden ürün kategorisine göre %1, %8 veya %18 oranında hesaplanır. Bu dönemde
                    toplam {report.totalTaxCollected.KDV.toLocaleString("tr-TR")} TL KDV tahsil edilmiştir.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Stopaj Hesaplaması</h3>
                  <p className="text-sm text-muted-foreground">
                    Stopaj, gelir üzerinden %20 oranında hesaplanır. Bu dönemde toplam{" "}
                    {report.totalTaxCollected.STOPAJ.toLocaleString("tr-TR")} TL stopaj tahsil edilmiştir.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Gelir Vergisi Hesaplaması</h3>
                  <p className="text-sm text-muted-foreground">
                    Gelir vergisi, net gelir üzerinden %20 oranında hesaplanır. Bu dönemde toplam{" "}
                    {report.totalTaxCollected.GELIR_VERGISI.toLocaleString("tr-TR")} TL gelir vergisi tahsil edilmiştir.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Muhtasar Hesaplaması</h3>
                  <p className="text-sm text-muted-foreground">
                    Muhtasar, brüt gelir üzerinden %2 oranında hesaplanır. Bu dönemde toplam{" "}
                    {report.totalTaxCollected.MUHTASAR.toLocaleString("tr-TR")} TL muhtasar tahsil edilmiştir.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Net Gelir Hesaplaması</h3>
                  <p className="text-sm text-muted-foreground">
                    Net gelir = Toplam Satış - Toplam Vergiler
                    <br />
                    {report.totalSales.toLocaleString("tr-TR")} TL -{" "}
                    {(
                      report.totalTaxCollected.KDV +
                      report.totalTaxCollected.STOPAJ +
                      report.totalTaxCollected.GELIR_VERGISI +
                      report.totalTaxCollected.MUHTASAR
                    ).toLocaleString("tr-TR")}{" "}
                    TL = {report.netIncome.toLocaleString("tr-TR")} TL
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Muhasebe Notları</CardTitle>
                <CardDescription>Muhasebe kayıtları için önemli bilgiler</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">KDV Beyannamesi</h3>
                  <p className="text-sm text-muted-foreground">
                    KDV beyannamesi her ayın 24'üne kadar verilmelidir. Bu dönem için beyan edilecek KDV tutarı:{" "}
                    {report.totalTaxCollected.KDV.toLocaleString("tr-TR")} TL
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Muhtasar Beyanname</h3>
                  <p className="text-sm text-muted-foreground">
                    Muhtasar beyanname üç ayda bir verilmelidir. Bu dönem için hesaplanan muhtasar tutarı:{" "}
                    {report.totalTaxCollected.MUHTASAR.toLocaleString("tr-TR")} TL
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Gelir Vergisi Beyannamesi</h3>
                  <p className="text-sm text-muted-foreground">
                    Gelir vergisi beyannamesi yıllık olarak verilir. Bu dönem için hesaplanan gelir vergisi tutarı:{" "}
                    {report.totalTaxCollected.GELIR_VERGISI.toLocaleString("tr-TR")} TL
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
