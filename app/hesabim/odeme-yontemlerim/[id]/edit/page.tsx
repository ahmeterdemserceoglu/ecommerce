"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function EditCardPage() {
  const router = useRouter()
  const params = useParams()
  const cardId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [card, setCard] = useState<any>(null)
  const [cardholderName, setCardholderName] = useState("")
  const [expiryMonth, setExpiryMonth] = useState("")
  const [expiryYear, setExpiryYear] = useState("")
  const [step, setStep] = useState<'verify' | 'edit'>("verify")
  const [code, setCode] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [cardNumber, setCardNumber] = useState("")
  const [cvv, setCvv] = useState("")

  useEffect(() => {
    if (!cardId) return
    if (step === "edit") {
      const fetchCard = async () => {
        setLoading(true)
        setError(null)
        try {
          const res = await fetch(`/api/payment/methods/${cardId}`)
          const data = await res.json()
          if (!res.ok || data.error) throw new Error(data.error || "Kart bilgisi alınamadı")
          setCard(data.card)
          setTitle(data.card.title || "")
          setCardholderName(data.card.card_holder_name || "")
          setExpiryMonth(data.card.expiry_month || "")
          setExpiryYear(data.card.expiry_year || "")
        } catch (err: any) {
          setError(err.message)
        } finally {
          setLoading(false)
        }
      }
      fetchCard()
    }
  }, [cardId, step])

  // Kod gönder
  const handleSendCode = async () => {
    setCodeLoading(true)
    setCodeError(null)
    try {
      const res = await fetch("/api/payment/methods/send-edit-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "Kod gönderilemedi")
      setCodeSent(true)
    } catch (err: any) {
      setCodeError(err.message)
    } finally {
      setCodeLoading(false)
    }
  }

  // Kod doğrula
  const handleVerifyCode = async () => {
    setCodeLoading(true)
    setCodeError(null)
    try {
      const res = await fetch("/api/payment/methods/verify-edit-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, code }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "Kod doğrulanamadı")
      setStep("edit")
    } catch (err: any) {
      setCodeError(err.message)
    } finally {
      setCodeLoading(false)
    }
  }

  const handleUpdate = async () => {
    setError(null)
    try {
      const res = await fetch("/api/payment/methods/update-info", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, card_holder_name: cardholderName, expiry_month: expiryMonth, expiry_year: expiryYear, title, card_number: cardNumber, cvv }),
      })
      if (!res.ok) throw new Error("Kart güncellenemedi")
      router.push("/hesabim/odeme-yontemlerim")
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading && step === "edit") return <div className="container py-10">Yükleniyor...</div>

  return (
    <div className="container max-w-md mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Kartı Düzenle</CardTitle>
        </CardHeader>
        <CardContent>
          {step === "verify" && (
            <>
              <div className="mb-4">Kart bilgilerini düzenlemek için e-posta adresinize gönderilen doğrulama kodunu girin.</div>
              <div className="flex gap-2 mb-4">
                <Input value={code} onChange={e => setCode(e.target.value)} placeholder="Doğrulama Kodu" maxLength={6} />
                <Button onClick={handleVerifyCode} disabled={codeLoading || !code}>Doğrula</Button>
              </div>
              <Button variant="outline" onClick={handleSendCode} disabled={codeLoading || codeSent}>
                {codeLoading ? "Gönderiliyor..." : codeSent ? "Kod Gönderildi" : "Kodu Gönder"}
              </Button>
              {codeError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>Hata</AlertTitle>
                  <AlertDescription>{codeError}</AlertDescription>
                </Alert>
              )}
            </>
          )}
          {step === "edit" && card && (
            <>
              <div className="mb-4">
                <div className="font-medium">{card.card_holder_name || "-"}</div>
                <div className="text-sm text-muted-foreground">**** **** **** {card.last_four_digits || "****"}</div>
                <div className="text-xs">{card.expiry_month || "--"}/{card.expiry_year || "--"}</div>
              </div>
              <div className="mb-4">
                <label className="block mb-1 text-sm font-medium">Kart Sahibi Adı</label>
                <Input value={cardholderName} onChange={e => setCardholderName(e.target.value)} placeholder="Kart sahibi adı" />
              </div>
              <div className="mb-4 flex gap-2">
                <div className="flex-1">
                  <label className="block mb-1 text-sm font-medium">Son Kullanma Ayı</label>
                  <Input value={expiryMonth} onChange={e => setExpiryMonth(e.target.value)} placeholder="AA" maxLength={2} />
                </div>
                <div className="flex-1">
                  <label className="block mb-1 text-sm font-medium">Son Kullanma Yılı</label>
                  <Input value={expiryYear} onChange={e => setExpiryYear(e.target.value)} placeholder="YY" maxLength={2} />
                </div>
              </div>
              <div className="mb-4">
                <label className="block mb-1 text-sm font-medium">Kart Başlığı</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Kart başlığı" />
              </div>
              <div className="mb-4">
                <label className="block mb-1 text-sm font-medium">Kart Numarası</label>
                <Input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="Kart numarası" maxLength={32} />
              </div>
              <div className="mb-4">
                <label className="block mb-1 text-sm font-medium">CVV</label>
                <Input value={cvv} onChange={e => setCvv(e.target.value)} placeholder="CVV" maxLength={8} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => router.back()}>İptal</Button>
                <Button onClick={handleUpdate}>Kaydet</Button>
              </div>
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>Hata</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 