"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Store, AlertCircle, ArrowRight, Loader2 } from "lucide-react"

const formSchema = z.object({
  storeName: z.string().min(3, {
    message: "Mağaza adı en az 3 karakter olmalıdır.",
  }),
  storeSlug: z
    .string()
    .min(3, {
      message: "Mağaza URL'si en az 3 karakter olmalıdır.",
    })
    .regex(/^[a-z0-9-]+$/, {
      message: "Mağaza URL'si sadece küçük harfler, rakamlar ve tire içerebilir.",
    }),
  storeDescription: z.string().min(20, {
    message: "Mağaza açıklaması en az 20 karakter olmalıdır.",
  }),
  contactEmail: z.string().email({
    message: "Geçerli bir e-posta adresi giriniz.",
  }),
  contactPhone: z.string().min(10, {
    message: "Geçerli bir telefon numarası giriniz.",
  }),
  address: z.string().min(5, {
    message: "Adres en az 5 karakter olmalıdır.",
  }),
  city: z.string().min(2, {
    message: "Şehir en az 2 karakter olmalıdır.",
  }),
  country: z.string().min(2, {
    message: "Ülke en az 2 karakter olmalıdır.",
  }),
})

export default function SellerRegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasExistingApplication, setHasExistingApplication] = useState(false)
  const [existingApplicationStatus, setExistingApplicationStatus] = useState("")
  const supabase = createClientComponentClient()

  // Check if user already has a seller application
  const checkExistingApplication = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("seller_applications")
        .select("status")
        .eq("user_id", user.id)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("Error checking existing application:", error)
        return
      }

      if (data) {
        setHasExistingApplication(true)
        setExistingApplicationStatus(data.status)
      }
    } catch (error) {
      console.error("Error checking existing application:", error)
    }
  }

  // Check if user is already a seller
  const checkIfSeller = async () => {
    if (!user) return false

    try {
      const { data, error } = await supabase.from("profiles").select("role").eq("id", user.id).single()

      if (error) {
        console.error("Error checking user role:", error)
        return false
      }

      return data.role === "seller"
    } catch (error) {
      console.error("Error checking user role:", error)
      return false
    }
  }

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      storeName: "",
      storeSlug: "",
      storeDescription: "",
      contactEmail: user?.email || "",
      contactPhone: "",
      address: "",
      city: "",
      country: "Türkiye",
    },
  })

  // Check for existing application when component mounts
  useEffect(() => {
    if (!authLoading && user) {
      checkExistingApplication()
      checkIfSeller().then((isSeller) => {
        if (isSeller) {
          router.push("/seller/dashboard")
        }
      })
    } else if (!authLoading && !user) {
      router.push("/auth/login?returnTo=/auth/seller-register")
    }
  }, [user, authLoading])

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: "Hata",
        description: "Satıcı başvurusu yapmak için giriş yapmalısınız.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Check if slug is already taken
      const { data: slugCheck, error: slugError } = await supabase
        .from("stores")
        .select("id")
        .eq("slug", values.storeSlug)
        .maybeSingle()

      if (slugError) {
        throw new Error(slugError.message)
      }

      if (slugCheck) {
        form.setError("storeSlug", {
          type: "manual",
          message: "Bu mağaza URL'si zaten kullanılıyor. Lütfen başka bir URL seçin.",
        })
        setIsSubmitting(false)
        return
      }

      // Submit application
      const { error } = await supabase.from("seller_applications").insert({
        user_id: user.id,
        store_name: values.storeName,
        slug: values.storeSlug,
        store_description: values.storeDescription,
        contact_email: values.contactEmail,
        contact_phone: values.contactPhone,
        address: values.address,
        city: values.city,
        country: values.country,
        status: "pending",
      })

      if (error) throw error

      toast({
        title: "Başvuru Gönderildi",
        description: "Satıcı başvurunuz başarıyla alındı. İncelendikten sonra size bilgi verilecektir.",
      })

      setHasExistingApplication(true)
      setExistingApplicationStatus("pending")
    } catch (error: any) {
      console.error("Error submitting seller application:", error)
      toast({
        title: "Hata",
        description: error.message || "Başvuru gönderilirken bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Auto-generate slug from store name
  const handleStoreNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    form.setValue("storeName", value)

    // Only auto-generate slug if user hasn't manually edited it
    if (!form.getValues("storeSlug")) {
      const slug = value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
      form.setValue("storeSlug", slug)
    }
  }

  if (authLoading) {
    return (
      <div className="container max-w-md py-12">
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  if (hasExistingApplication) {
    return (
      <div className="container max-w-md py-12">
        <Card>
          <CardHeader>
            <CardTitle>Satıcı Başvurunuz</CardTitle>
            <CardDescription>Satıcı başvurunuzun durumu aşağıda görüntülenmektedir.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert
              className={
                existingApplicationStatus === "pending"
                  ? "border-yellow-500 text-yellow-700"
                  : existingApplicationStatus === "approved"
                    ? "border-green-500 text-green-700"
                    : "border-red-500 text-red-700"
              }
            >
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {existingApplicationStatus === "pending"
                  ? "Başvurunuz İnceleniyor"
                  : existingApplicationStatus === "approved"
                    ? "Başvurunuz Onaylandı"
                    : "Başvurunuz Reddedildi"}
              </AlertTitle>
              <AlertDescription>
                {existingApplicationStatus === "pending"
                  ? "Başvurunuz şu anda inceleniyor. Bu süreç birkaç gün sürebilir."
                  : existingApplicationStatus === "approved"
                    ? "Tebrikler! Başvurunuz onaylandı. Artık satıcı panelinize erişebilirsiniz."
                    : "Üzgünüz, başvurunuz reddedildi. Daha fazla bilgi için lütfen bizimle iletişime geçin."}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-end">
            {existingApplicationStatus === "approved" ? (
              <Button asChild>
                <Link href="/seller/dashboard">
                  Satıcı Paneline Git
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/">Ana Sayfaya Dön</Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Satıcı Başvurusu</CardTitle>
          <CardDescription>
            Platformumuzda satıcı olmak için aşağıdaki formu doldurun. Başvurunuz incelendikten sonra size bilgi
            verilecektir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Store className="h-5 w-5" />
                  <h3 className="text-lg font-medium">Mağaza Bilgileri</h3>
                </div>

                <FormField
                  control={form.control}
                  name="storeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mağaza Adı</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Mağazanızın adı"
                          {...field}
                          onChange={handleStoreNameChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>
                        Müşterilerin göreceği mağaza adınız. Örn: &quot;Teknoloji Dünyası&quot;
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="storeSlug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mağaza URL&apos;si</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <span className="bg-muted px-3 py-2 text-sm border border-r-0 rounded-l-md border-input">
                            hdticaret.com/magaza/
                          </span>
                          <Input
                            className="rounded-l-none"
                            placeholder="magazaniz"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Mağazanızın web adresi. Sadece küçük harfler, rakamlar ve tire kullanabilirsiniz.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="storeDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mağaza Açıklaması</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Mağazanız hakkında kısa bir açıklama"
                          className="min-h-[120px]"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>
                        Mağazanızı ve sattığınız ürünleri tanıtan kısa bir açıklama yazın.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4 flex items-center gap-2 text-primary">
                  <Store className="h-5 w-5" />
                  <h3 className="text-lg font-medium">İletişim Bilgileri</h3>
                </div>

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>İletişim E-postası</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="ornek@firma.com" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormDescription>Müşteri iletişimleri için kullanılacak e-posta adresi.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>İletişim Telefonu</FormLabel>
                      <FormControl>
                        <Input placeholder="05XX XXX XX XX" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormDescription>Müşteri iletişimleri için kullanılacak telefon numarası.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4 flex items-center gap-2 text-primary">
                  <Store className="h-5 w-5" />
                  <h3 className="text-lg font-medium">Adres Bilgileri</h3>
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adres</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Mağazanızın veya şirketinizin adresi"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Şehir</FormLabel>
                        <FormControl>
                          <Input placeholder="İstanbul" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ülke</FormLabel>
                        <FormControl>
                          <Input placeholder="Türkiye" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    "Başvuruyu Gönder"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href="/">İptal</Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            Zaten bir hesabınız var mı?{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              Giriş Yap
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
