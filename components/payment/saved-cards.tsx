"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CreditCard, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SavedCardsProps {
  userId: string
}

interface SavedCard {
  id: string
  cardHolderName: string
  lastFourDigits: string
  expiryMonth: string
  expiryYear: string
  cardType: string
  isDefault: boolean
}

export default function SavedCards({ userId }: SavedCardsProps) {
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [cards, setCards] = useState<SavedCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCards()
  }, [userId])

  const fetchCards = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/payment/methods?userId=${userId}`)
      const data = await response.json()

      if (data.savedCards) {
        setCards(data.savedCards)
      }
    } catch (error) {
      console.error("Kayıtlı kartlar yüklenirken hata:", error)
      toast({
        title: "Hata",
        description: "Kayıtlı kartlar yüklenemedi.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (cardId: string) => {
    try {
      const response = await fetch("/api/payment/methods", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          cardId,
          isDefault: true,
        }),
      })

      if (!response.ok) {
        throw new Error("Varsayılan kart ayarlanamadı")
      }

      // Kartları güncelle
      setCards(
        cards.map((card) => ({
          ...card,
          isDefault: card.id === cardId,
        })),
      )

      toast({
        title: "Başarılı",
        description: "Varsayılan kart güncellendi.",
      })
    } catch (error: any) {
      console.error("Varsayılan kart ayarlanırken hata:", error)
      toast({
        title: "Hata",
        description: error.message || "Varsayılan kart ayarlanamadı.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    try {
      const response = await fetch(`/api/payment/methods?cardId=${cardId}&userId=${userId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Kart silinemedi")
      }

      // Kartları güncelle
      setCards(cards.filter((card) => card.id !== cardId))

      toast({
        title: "Başarılı",
        description: "Kart başarıyla silindi.",
      })
    } catch (error: any) {
      console.error("Kart silinirken hata:", error)
      toast({
        title: "Hata",
        description: error.message || "Kart silinemedi.",
        variant: "destructive",
      })
    }
  }

  const getCardTypeIcon = (cardType: string) => {
    switch (cardType) {
      case "VISA":
        return "💳 Visa"
      case "MASTERCARD":
        return "💳 Mastercard"
      case "AMEX":
        return "💳 Amex"
      case "TROY":
        return "💳 Troy"
      default:
        return "💳 Kart"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kayıtlı Kartlarım</CardTitle>
          <CardDescription>Yükleniyor...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kayıtlı Kartlarım</CardTitle>
        <CardDescription>Kayıtlı kredi ve banka kartlarınızı yönetin</CardDescription>
      </CardHeader>
      <CardContent>
        {cards.length === 0 ? (
          <div className="text-center py-6">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">Henüz kayıtlı kartınız bulunmuyor.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cards.map((card) => (
              <div key={card.id} className="flex items-center justify-between border p-4 rounded-md">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <CreditCard className="h-10 w-10" />
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {card.cardHolderName}
                      {card.isDefault && <Badge variant="outline">Varsayılan</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">**** **** **** {card.lastFourDigits}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{getCardTypeIcon(card.cardType)}</span>
                      <span>
                        Son Kullanma: {card.expiryMonth}/{card.expiryYear}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!card.isDefault && (
                    <Button variant="outline" size="sm" onClick={() => handleSetDefault(card.id)}>
                      Varsayılan Yap
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Kartı Sil</AlertDialogTitle>
                        <AlertDialogDescription>
                          Bu kartı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteCard(card.id)}>Sil</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Kartlarınız güvenli bir şekilde saklanmaktadır. Kart bilgileriniz şifrelenerek korunur ve tam kart numarası
          hiçbir zaman saklanmaz.
        </p>
      </CardFooter>
    </Card>
  )
}
