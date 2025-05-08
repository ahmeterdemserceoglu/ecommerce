"use client"

import type React from "react"

import { useState } from "react"
import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

export function NewsletterSignup() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes("@")) {
      toast({
        title: "Geçersiz e-posta adresi",
        description: "Lütfen geçerli bir e-posta adresi girin.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Burada API çağrısı yapılacak
      // Örnek: await fetch('/api/newsletter', { method: 'POST', body: JSON.stringify({ email }) })

      // Başarılı kayıt simülasyonu
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Kayıt başarılı!",
        description: "E-bülten listemize başarıyla kaydoldunuz.",
      })

      setEmail("")
    } catch (error) {
      toast({
        title: "Bir hata oluştu",
        description: "Lütfen daha sonra tekrar deneyin.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="mb-12 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl text-center">
        <Mail className="mx-auto mb-4 h-12 w-12 text-orange-400" />
        <h2 className="mb-3 text-3xl font-bold">Fırsatlardan Haberdar Olun</h2>
        <p className="mb-6 text-gray-300">En yeni ürünler, özel indirimler ve kampanyalardan ilk siz haberdar olun.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:gap-0">
          <Input
            type="email"
            placeholder="E-posta adresiniz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 flex-1 border-0 bg-white/10 text-white placeholder:text-gray-400 focus-visible:ring-orange-500 sm:rounded-r-none"
          />
          <Button
            type="submit"
            className="h-12 bg-orange-500 text-white hover:bg-orange-600 sm:rounded-l-none"
            disabled={isLoading}
          >
            {isLoading ? "Kaydediliyor..." : "Abone Ol"}
          </Button>
        </form>

        <p className="mt-4 text-xs text-gray-400">
          Kaydolarak, gizlilik politikamızı kabul etmiş olursunuz. İstediğiniz zaman abonelikten çıkabilirsiniz.
        </p>
      </div>
    </section>
  )
}

export default NewsletterSignup
