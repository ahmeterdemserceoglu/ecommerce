"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
// import { ShoppingBag } from 'lucide-react'; // Örnek logo ikonu

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
  // const [loading, setLoading] = useState(false) // authLoading zaten bu işi görüyor gibi

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    // setLoading(true) // signUp içinde setLoading(true) çağrılıyor olmalı

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Şifreler eşleşmiyor",
        description: "Lütfen şifrelerin aynı olduğundan emin olun.",
        variant: "destructive",
      })
      // setLoading(false) // Gerek yok, işlem devam etmiyor
      return
    }

    // Şifre gücü kontrolü (basit örnek)
    if (formData.password.length < 6) {
      toast({
        title: "Şifre çok kısa",
        description: "Şifreniz en az 6 karakter uzunluğunda olmalıdır.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await signUp(formData.email, formData.password, formData.fullName)

      if (!result.success) {
        // setLoading(false) // signUp içinde setLoading(false) çağrılıyor olmalı
        // toast zaten signUp içinde gösteriliyor olmalı (result.message ile)
        return
      }

      // Başarılı kayıt toast'ı zaten signUp içinde olmalı
      // toast({
      //   title: "Kayıt başarılı",
      //   description: "Hesabınızı doğrulamak için lütfen e-postanızı kontrol edin.",
      // })

      router.push("/auth/login")
    } catch (error: any) {
      // Bu catch bloğu genellikle signUp içindeki try-catch tarafından yakalanmayan 
      // beklenmedik hatalar için kalabilir, ancak signUp'ın kendi hata yönetiminin 
      // yeterli olması hedeflenir.
      toast({
        title: "Beklenmedik Kayıt Hatası",
        description: error.message || "Kayıt sırasında bilinmeyen bir hata oluştu.",
        variant: "destructive",
      })
    }
    // finally {
    //   setLoading(false) // signUp içinde yönetiliyor olmalı
    // }
  }

  return (
    <main className="container mx-auto flex flex-1 flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg shadow-xl rounded-xl">
        <CardHeader className="text-center">
          {/* <ShoppingBag className="mx-auto h-12 w-12 text-orange-600 mb-4" /> */}
          <div className="mb-4">
            <Link href="/" className="inline-block">
              <h1 className="text-4xl font-bold tracking-tight text-orange-600 dark:text-orange-500">
                HD Ticaret
              </h1>
            </Link>
          </div>
          <CardTitle className="text-2xl font-semibold">Yeni Hesap Oluşturun</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Aramıza katılmak için bilgilerinizi girin.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-6 sm:px-8">
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium text-gray-700 dark:text-gray-300">Ad Soyad</Label>
              <Input
                id="fullName"
                placeholder="Adınız ve Soyadınız"
                value={formData.fullName}
                onChange={handleChange}
                required
                disabled={authLoading}
                className="h-10 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">E-posta Adresiniz</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={authLoading}
                className="h-10 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">Şifre</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={authLoading}
                className="h-10 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">Şifre Tekrar</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={authLoading}
                className="h-10 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-md text-base transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              disabled={authLoading}
            >
              {authLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Hesap Oluşturuluyor...
                </div>
              ) : (
                "Hesabımı Oluştur"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center pt-6 pb-8">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            Zaten bir hesabınız var mı?{" "}
            <Link href="/auth/login" className="font-medium text-orange-600 hover:text-orange-500 hover:underline dark:text-orange-500 dark:hover:text-orange-400">
              Giriş Yapın
            </Link>
          </div>
          <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Satıcı olarak mı katılmak istiyorsunuz?{" "}
            <Link href="/auth/seller-register" className="font-medium text-orange-600 hover:text-orange-500 hover:underline dark:text-orange-500 dark:hover:text-orange-400">
              Satıcı Başvurusu Yapın
            </Link>
          </div>
        </CardFooter>
      </Card>
    </main>
  )
}
