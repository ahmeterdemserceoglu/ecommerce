"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { signUp, loading: authLoading } = useAuth()
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Şifreler eşleşmiyor",
        description: "Lütfen şifrelerin aynı olduğundan emin olun.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    try {
      const result = await signUp(formData.email, formData.password, formData.fullName)

      if (!result.success) {
        setLoading(false)
        toast({
          title: "Kayıt başarısız",
          description: result.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Kayıt başarılı",
        description: "Hesabınızı doğrulamak için lütfen e-postanızı kontrol edin.",
      })

      router.push("/auth/login")
    } catch (error: any) {
      toast({
        title: "Kayıt başarısız",
        description: error.message || "Kayıt sırasında bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container flex h-screen items-center justify-center">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Hesap oluştur</CardTitle>
          <CardDescription>Hesap oluşturmak için bilgilerinizi girin</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Ad Soyad</Label>
              <Input
                id="fullName"
                placeholder="Ahmet Yılmaz"
                value={formData.fullName}
                onChange={handleChange}
                required
                disabled={loading || authLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading || authLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading || authLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading || authLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || authLoading}>
              {loading || authLoading ? "Hesap oluşturuluyor..." : "Kayıt Ol"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm">
            Zaten hesabınız var mı?{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              Giriş yap
            </Link>
          </div>
          <div className="text-center text-sm">
            Satıcı olmak ister misiniz?{" "}
            <Link href="/auth/seller-register" className="text-primary hover:underline">
              Başvuru yap
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
