"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, user } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const returnTo = searchParams.get("returnTo") || "/"

  // Kullanıcı zaten giriş yapmışsa yönlendir
  useEffect(() => {
    if (user) {
      router.push(returnTo)
    }
  }, [user, router, returnTo])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await signIn(email, password)

      if (result.error) {
        // Hata mesajlarını Türkçeleştir
        if (result.error.includes("Invalid login credentials")) {
          setError("Geçersiz e-posta veya şifre.")
        } else if (result.error.includes("Email not confirmed")) {
          setError("E-posta adresiniz doğrulanmamış. Lütfen e-postanızı kontrol edin.")
        } else if (result.error.includes("Too many requests")) {
          setError("Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin.")
        } else {
          setError(result.error)
        }
      } else {
        router.push(returnTo)
      }
    } catch (error: any) {
      setError("Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.")
      console.error("Login error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-6xl flex min-h-[calc(100vh-200px)] items-center justify-center py-10">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Giriş Yap</CardTitle>
          <CardDescription>Hesabınıza giriş yaparak alışverişe devam edin</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Hata</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">E-posta</TabsTrigger>
              <TabsTrigger value="phone">Telefon</TabsTrigger>
            </TabsList>
            <TabsContent value="email">
              <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Şifre</Label>
                    <Link href="/sifremi-unuttum" className="text-xs text-primary hover:underline">
                      Şifremi Unuttum
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="phone">
              <div className="flex flex-col items-center justify-center space-y-4 pt-4">
                <p className="text-center text-sm text-muted-foreground">
                  Telefon numarası ile giriş yakında aktif olacaktır.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">veya</span>
            </div>
          </div>

          <div className="grid gap-2">
            <Button variant="outline" className="w-full">
              Google ile Giriş Yap
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm">
            Hesabınız yok mu?{" "}
            <Link href="/kayit-ol" className="text-primary hover:underline">
              Kayıt Ol
            </Link>
          </div>
          <div className="text-center text-sm">
            Satıcı olmak mı istiyorsunuz?{" "}
            <Link href="/satici-ol" className="text-primary hover:underline">
              Satıcı Başvurusu
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
