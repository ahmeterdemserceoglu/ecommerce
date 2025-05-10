"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showResendEmailLink, setShowResendEmailLink] = useState(false)
  const [isResendingEmail, setIsResendingEmail] = useState(false)

  const { signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const returnTo = searchParams.get("returnTo") || "/"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setShowResendEmailLink(false)
    setIsLoading(true)

    try {
      const result = await signIn(email, password)

      if (!result.success) {
        if (result.message && (result.message.toLowerCase().includes("email not confirmed") || result.message.toLowerCase().includes("e-posta adresiniz henüz onaylanmamış"))) {
          setError("E-posta adresiniz henüz onaylanmamış. Lütfen gelen kutunuzu kontrol edin veya onay e-postasını tekrar gönderin.")
          setShowResendEmailLink(true)
        } else {
          setError(result.message || "Giriş bilgileri hatalı veya bir sorun oluştu.")
        }
        setIsLoading(false)
        return
      }
      router.push(returnTo)
    } catch (err: any) {
      setError(err.message || "Giriş sırasında beklenmedik bir hata oluştu.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (!email) {
      toast({
        title: "E-posta Gerekli",
        description: "Lütfen e-posta alanını doldurun.",
        variant: "destructive",
      })
      return
    }
    setIsResendingEmail(true)
    setError(null)
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (resendError) {
        console.error("Resend email error:", resendError)
        let friendlyMessage = "Doğrulama e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin."
        if (resendError.message.includes("rate limit")) {
          friendlyMessage = "Çok fazla deneme yaptınız. Lütfen biraz bekleyip tekrar deneyin."
        } else if (resendError.message.includes("Unable to resend email for this address")) {
          friendlyMessage = "Bu e-posta adresi için tekrar gönderim yapılamıyor. Adres doğru mu?"
        } else if (resendError.message.includes("User not found")) {
          friendlyMessage = "Bu e-posta ile kayıtlı bir kullanıcı bulunamadı."
        }
        toast({
          title: "Gönderim Hatası",
          description: friendlyMessage,
          variant: "destructive",
        })
      } else {
        toast({
          title: "E-posta Başarıyla Gönderildi",
          description: `${email} adresine yeni bir doğrulama e-postası gönderildi. Lütfen gelen kutunuzu (ve spam klasörünü) kontrol edin.`,
          variant: "default",
        })
        setShowResendEmailLink(false)
      }
    } catch (err: any) {
      console.error("Unexpected resend email error:", err)
      toast({
        title: "Beklenmedik Hata",
        description: "E-posta gönderilirken bilinmeyen bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setIsResendingEmail(false)
    }
  }

  return (
    <main className="container mx-auto flex flex-1 flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg shadow-xl rounded-xl">
        <CardHeader className="text-center">
          <div className="mb-4">
            <Link href="/" className="inline-block">
              <h1 className="text-4xl font-bold tracking-tight text-orange-600 dark:text-orange-500">
                HD Ticaret
              </h1>
            </Link>
          </div>
          <CardTitle className="text-2xl font-semibold">Hoş Geldiniz!</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Hesabınıza giriş yaparak devam edin.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-6 sm:px-8">
          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/50 rounded-md">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <AlertTitle className="font-semibold text-red-700 dark:text-red-300">Giriş Hatası</AlertTitle>
              <AlertDescription className="text-red-600 dark:text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {showResendEmailLink && (
            <div className="mb-4 text-center text-sm">
              <Button
                variant="link"
                onClick={handleResendEmail}
                disabled={isResendingEmail}
                className="text-orange-600 hover:text-orange-500 p-0 h-auto disabled:opacity-70"
              >
                {isResendingEmail ? "Gönderiliyor..." : "Doğrulama E-postasını Tekrar Gönder"}
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">E-posta Adresiniz</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || isResendingEmail}
                className="h-10 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">Şifre</Label>
                <Link
                  href="/auth/sifremi-unuttum"
                  className="text-xs font-medium text-orange-600 hover:text-orange-500 hover:underline dark:text-orange-500 dark:hover:text-orange-400"
                >
                  Şifremi Unuttum?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading || isResendingEmail}
                className="h-10 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-md text-base transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              disabled={isLoading || isResendingEmail}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Giriş Yapılıyor...
                </div>
              ) : (
                "Giriş Yap"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center pt-6 pb-8">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            Hesabınız yok mu?{" "}
            <Link
              href="/auth/register"
              className="font-medium text-orange-600 hover:text-orange-500 hover:underline dark:text-orange-500 dark:hover:text-orange-400"
            >
              Hemen Kayıt Olun
            </Link>
          </div>
        </CardFooter>
      </Card>
    </main>
  )
}
