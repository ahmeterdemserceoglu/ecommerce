"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, CreditCard, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface SavedCard {
  id: string
  cardHolderName: string
  lastFourDigits: string
  cardType: string
  expiryMonth: string
  expiryYear: string
  isDefault: boolean
  title?: string
}

export default function PaymentMethodsPage() {
  const router = useRouter()
  const auth = (useAuth() as any) || {}
  const user = auth.user

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savedCards, setSavedCards] = useState<SavedCard[]>([])
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editingCardId, setEditingCardId] = useState<string | null>(null)

  const fetchSavedCards = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // API üzerinden kayıtlı kartları al
      const response = await fetch("/api/payment/methods")

      if (!response.ok) {
        throw new Error(`API hatası: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        // API'den dönen hata mesajını göster
        throw new Error(data.error)
      }

      if (data.savedCards && Array.isArray(data.savedCards)) {
        setSavedCards(data.savedCards)
      } else {
        setSavedCards([])
      }
    } catch (error: any) {
      console.error("Kayıtlı kartlar yüklenirken hata:", error)
      setError(error.message || "Kayıtlı kartlar yüklenirken bir hata oluştu")
      // Hata durumunda boş bir dizi göster
      setSavedCards([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Kullanıcı oturum açmamışsa giriş sayfasına yönlendir
    if (auth.isLoaded && !user) {
      router.push("/giris?returnUrl=/hesabim/odeme-yontemlerim")
      return
    }

    if (user) {
      fetchSavedCards()
    } else {
      setLoading(false)
    }
  }, [auth.isLoaded, user, router, fetchSavedCards])

  const handleSetDefault = async (cardId: string) => {
    try {
      const response = await fetch(`/api/payment/methods/set-default?cardId=${cardId}`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Varsayılan kart ayarlanamadı")
      }

      // Kartları yeniden yükle
      fetchSavedCards()
    } catch (error: any) {
      console.error("Varsayılan kart ayarlanırken hata:", error)
      setError(error.message || "Varsayılan kart ayarlanırken bir hata oluştu")
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    try {
      const response = await fetch(`/api/payment/methods/delete?cardId=${cardId}`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Kart silinemedi")
      }

      // Kartları yeniden yükle
      fetchSavedCards()
    } catch (error: any) {
      console.error("Kart silinirken hata:", error)
      setError(error.message || "Kart silinirken bir hata oluştu")
    }
  }

  const openEditModal = (card: SavedCard) => {
    setEditingCardId(card.id)
    setEditTitle(card.title || "")
    setEditModalOpen(true)
  }

  const handleUpdateTitle = async () => {
    if (!editingCardId) return
    try {
      const res = await fetch("/api/payment/methods/update-title", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: editingCardId, title: editTitle }),
      })
      if (res.ok) {
        setEditModalOpen(false)
        fetchSavedCards()
      } else {
        setError("Kart başlığı güncellenemedi.")
      }
    } catch (err) {
      setError("Kart başlığı güncellenemedi.")
    }
  }

  if (loading) {
    return (
      <div className="container py-10 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Ödeme Yöntemlerim</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-full mb-4" />
                <div className="flex justify-end space-x-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container py-10 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Ödeme Yöntemlerim</h1>
        <Button asChild>
          <Link href="/hesabim/odeme-yontemlerim/ekle">
            <PlusCircle className="mr-2 h-4 w-4" /> Yeni Kart Ekle
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Hata</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="cards">
        <TabsList className="mb-6">
          <TabsTrigger value="cards">Kayıtlı Kartlarım</TabsTrigger>
          <TabsTrigger value="other" disabled>
            Diğer Ödeme Yöntemleri
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cards">
          {savedCards.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {savedCards.map((card) => (
                <Card key={card.id} className={card.isDefault ? "border-primary" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">
                        <CreditCard className="h-5 w-5 inline mr-1" /> {card.cardType}
                      </CardTitle>
                      {card.isDefault && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                          Varsayılan
                        </span>
                      )}
                    </div>
                    <CardDescription>{card.cardHolderName}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-lg font-mono">•••• •••• •••• {card.lastFourDigits}</div>
                      <div className="text-sm text-muted-foreground">
                        {card.expiryMonth}/{card.expiryYear}
                      </div>
                    </div>
                    <div className="flex justify-end mt-4 space-x-2">
                      {!card.isDefault && (
                        <Button variant="outline" size="sm" onClick={() => handleSetDefault(card.id)}>
                          Varsayılan Yap
                        </Button>
                      )}
                      <Link href={`/hesabim/odeme-yontemlerim/${card.id}/edit`} passHref legacyBehavior>
                        <Button as="a" variant="outline" size="sm">Düzenle</Button>
                      </Link>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteCard(card.id)}>
                        Sil
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Henüz kayıtlı kart bulunamadı</CardTitle>
                <CardDescription>Ödeme yapmak için bir kart ekleyin</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/hesabim/odeme-yontemlerim/ekle">
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Kart Ekle
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <div className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Yeni bir kart eklemek için aşağıdaki butona tıklayın
                  </p>
                  <Button asChild>
                    <Link href="/hesabim/odeme-yontemlerim/ekle">
                      <PlusCircle className="mr-2 h-4 w-4" /> Yeni Kart Ekle
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="other">
          <Card>
            <CardHeader>
              <CardTitle>Diğer Ödeme Yöntemleri</CardTitle>
              <CardDescription>Yakında kullanıma sunulacak</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Diğer ödeme yöntemleri yakında eklenecektir.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
