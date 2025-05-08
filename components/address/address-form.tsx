"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"

// Türkiye'deki şehirler
const CITIES = [
  "Adana",
  "Adıyaman",
  "Afyonkarahisar",
  "Ağrı",
  "Amasya",
  "Ankara",
  "Antalya",
  "Artvin",
  "Aydın",
  "Balıkesir",
  "Bilecik",
  "Bingöl",
  "Bitlis",
  "Bolu",
  "Burdur",
  "Bursa",
  "Çanakkale",
  "Çankırı",
  "Çorum",
  "Denizli",
  "Diyarbakır",
  "Edirne",
  "Elazığ",
  "Erzincan",
  "Erzurum",
  "Eskişehir",
  "Gaziantep",
  "Giresun",
  "Gümüşhane",
  "Hakkari",
  "Hatay",
  "Isparta",
  "Mersin",
  "İstanbul",
  "İzmir",
  "Kars",
  "Kastamonu",
  "Kayseri",
  "Kırklareli",
  "Kırşehir",
  "Kocaeli",
  "Konya",
  "Kütahya",
  "Malatya",
  "Manisa",
  "Kahramanmaraş",
  "Mardin",
  "Muğla",
  "Muş",
  "Nevşehir",
  "Niğde",
  "Ordu",
  "Rize",
  "Sakarya",
  "Samsun",
  "Siirt",
  "Sinop",
  "Sivas",
  "Tekirdağ",
  "Tokat",
  "Trabzon",
  "Tunceli",
  "Şanlıurfa",
  "Uşak",
  "Van",
  "Yozgat",
  "Zonguldak",
  "Aksaray",
  "Bayburt",
  "Karaman",
  "Kırıkkale",
  "Batman",
  "Şırnak",
  "Bartın",
  "Ardahan",
  "Iğdır",
  "Yalova",
  "Karabük",
  "Kilis",
  "Osmaniye",
  "Düzce",
]

const addressFormSchema = z.object({
  title: z.string().min(2, {
    message: "Adres başlığı en az 2 karakter olmalıdır",
  }),
  full_name: z.string().min(2, {
    message: "Ad soyad en az 2 karakter olmalıdır",
  }),
  address: z.string().min(5, {
    message: "Adres en az 5 karakter olmalıdır",
  }),
  city: z.string().min(2, {
    message: "Şehir seçilmelidir",
  }),
  district: z.string().min(2, {
    message: "İlçe en az 2 karakter olmalıdır",
  }),
  postal_code: z.string().min(5, {
    message: "Posta kodu en az 5 karakter olmalıdır",
  }),
  country: z.string().default("Türkiye"),
  phone: z.string().min(10, {
    message: "Telefon numarası en az 10 karakter olmalıdır",
  }),
  address_type: z.enum(["shipping", "billing", "both"], {
    required_error: "Adres tipi seçilmelidir",
  }),
  is_default: z.boolean().default(false),
})

type AddressFormValues = z.infer<typeof addressFormSchema>

interface AddressFormProps {
  address?: any
  onSuccess?: () => void
}

export function AddressForm({ address, onSuccess }: AddressFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultValues: Partial<AddressFormValues> = {
    title: address?.title || "",
    full_name: address?.full_name || "",
    address: address?.address || "",
    city: address?.city || "",
    district: address?.district || "",
    postal_code: address?.postal_code || "",
    country: address?.country || "Türkiye",
    phone: address?.phone || "",
    address_type: address?.address_type || "shipping",
    is_default: address?.is_default || false,
  }

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues,
  })

  async function onSubmit(data: AddressFormValues) {
    setIsSubmitting(true)
    try {
      const endpoint = "/api/addresses"
      const method = address ? "PUT" : "POST"

      // Adres ID'sinin doğru şekilde gönderildiğinden emin olalım
      const body = address
        ? {
            id: address.id, // Burada id'nin string olduğundan emin olalım
            ...data,
          }
        : data

      console.log("Gönderilen adres verisi:", body) // Debug için

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Bir hata oluştu")
      }

      toast({
        title: address ? "Adres güncellendi" : "Adres eklendi",
        description: address ? "Adresiniz başarıyla güncellendi." : "Yeni adresiniz başarıyla eklendi.",
      })

      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/hesabim/adreslerim")
        router.refresh()
      }
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Adres Başlığı</FormLabel>
                <FormControl>
                  <Input placeholder="Örn: Ev, İş" {...field} />
                </FormControl>
                <FormDescription>Bu adresi tanımlamak için kısa bir başlık girin.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ad Soyad</FormLabel>
                <FormControl>
                  <Input placeholder="Ad Soyad" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adres</FormLabel>
              <FormControl>
                <Textarea placeholder="Sokak, mahalle, bina no, daire no vb." className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Şehir</FormLabel>
                <FormControl>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...field}
                  >
                    <option value="">Şehir Seçin</option>
                    {CITIES.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="district"
            render={({ field }) => (
              <FormItem>
                <FormLabel>İlçe</FormLabel>
                <FormControl>
                  <Input placeholder="İlçe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="postal_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Posta Kodu</FormLabel>
                <FormControl>
                  <Input placeholder="Posta Kodu" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefon</FormLabel>
                <FormControl>
                  <Input placeholder="Telefon Numarası" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address_type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Adres Tipi</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="shipping" />
                    </FormControl>
                    <FormLabel className="font-normal">Teslimat Adresi</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="billing" />
                    </FormControl>
                    <FormLabel className="font-normal">Fatura Adresi</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="both" />
                    </FormControl>
                    <FormLabel className="font-normal">Hem Teslimat Hem Fatura Adresi</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_default"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Varsayılan adres olarak ayarla</FormLabel>
                <FormDescription>Bu adres, siparişlerinizde otomatik olarak seçilecektir.</FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/hesabim/adreslerim")}
            disabled={isSubmitting}
          >
            İptal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Kaydediliyor..." : address ? "Güncelle" : "Kaydet"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
