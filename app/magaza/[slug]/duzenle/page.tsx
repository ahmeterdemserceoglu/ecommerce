"use client"

import type React from "react"
import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Loader2, ArrowLeft, Trash2 } from "lucide-react"
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

// Bu bileşen, mağaza bilgilerini düzenlemek için kullanılacak.
// app/seller/stores/[id]/edit/page.tsx dosyasındaki form yapısına benzer olacak.
// Şimdilik temel bir iskelet oluşturalım.

interface StoreFormProps {
    storeData: any;
    onSave: (updatedStore: any) => Promise<void>;
    saving: boolean;
}

function StoreEditForm({ storeData, onSave, saving }: StoreFormProps) {
    const [store, setStore] = useState(storeData)

    useEffect(() => {
        setStore(storeData)
    }, [storeData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSave(store)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setStore((prev: any) => ({ ...prev, [name]: value }))
    }

    return (
        <form onSubmit={handleSubmit}>
            <Card>
                <CardHeader>
                    <CardTitle>Mağaza Bilgilerini Düzenle</CardTitle>
                    <CardDescription>Mağazanızın genel bilgilerini buradan güncelleyebilirsiniz.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Mağaza Adı</Label>
                        <Input id="name" name="name" value={store?.name || ""} onChange={handleChange} placeholder="Mağazanızın Adı" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Açıklama</Label>
                        <Textarea id="description" name="description" value={store?.description || ""} onChange={handleChange} placeholder="Mağazanız hakkında kısa bir açıklama" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="logo_url">Logo URL</Label>
                        <Input id="logo_url" name="logo_url" value={store?.logo_url || ""} onChange={handleChange} placeholder="https://ornek.com/logo.png" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="banner_url">Banner URL</Label>
                        <Input id="banner_url" name="banner_url" value={store?.banner_url || ""} onChange={handleChange} placeholder="https://ornek.com/banner.png" />
                    </div>
                    {/* TODO: Telefon, çalışma saatleri gibi diğer alanlar buraya eklenebilir. */}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => window.history.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Kaydet
                    </Button>
                </CardFooter>
            </Card>
        </form>
    )
}


export default function EditStoreBySlugPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
    const params = use(paramsPromise)
    const { slug } = params

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    // const [deleting, setDeleting] = useState(false) // Silme işlevi eklenecekse
    const [store, setStore] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClientComponentClient()
    const router = useRouter()

    useEffect(() => {
        if (slug) {
            fetchStoreDetailsBySlug()
        }
    }, [slug])

    const fetchStoreDetailsBySlug = async () => {
        try {
            setLoading(true)
            setError(null)

            const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

            if (sessionError || !sessionData.session) {
                toast({ title: "Oturum hatası", description: "Lütfen tekrar giriş yapın", variant: "destructive" })
                router.push("/auth/login?returnTo=/magaza/" + slug + "/duzenle")
                return
            }

            const userId = sessionData.session.user.id

            const { data: storeData, error: storeError } = await supabase
                .from("stores")
                .select("*, owner:profiles!stores_owner_id_fkey(id, full_name)") // user_id yerine owner_id olabilir, kontrol et
                .eq("slug", slug)
                .single()

            if (storeError) {
                console.error("Mağaza bilgileri alınamadı (slug ile):", storeError)
                setError("Mağaza bilgileri yüklenirken bir sorun oluştu. " + storeError.message)
                setStore(null)
                return
            }

            if (!storeData) {
                setError("Mağaza bulunamadı.")
                setStore(null)
                return
            }

            // user_id'nin stores tablosundaki foreign key adını kontrol etmeliyiz. 
            // Eğer owner_id ise storeData.owner_id, user_id ise storeData.user_id olmalı.
            // Şimdilik storeData.user_id veya storeData.owner.id varsayalım.
            // En iyisi stores tablosundaki owner referansının user_id olduğunu varsaymak. Ya da `profiles` ile join yapıldıysa `storeData.owner.id`

            let storeOwnerId = storeData.user_id; // Varsayılan
            if (storeData.owner && storeData.owner.id) {
                storeOwnerId = storeData.owner.id;
            } else if (storeData.owner_id) { // Eğer owner join'i yoksa direkt owner_id
                storeOwnerId = storeData.owner_id;
            }


            if (storeOwnerId !== userId) {
                setError("Bu mağazayı düzenleme yetkiniz yok.")
                setStore(null)
                // Yönlendirme yapılabilir: router.push("/")
                return
            }

            setStore(storeData)
        } catch (err: any) {
            console.error("Beklenmeyen bir hata oluştu:", err)
            setError("Beklenmeyen bir hata oluştu: " + err.message)
            setStore(null)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateStore = async (updatedStoreData: any) => {
        try {
            setSaving(true)
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
            // Yetkilendirme: Giriş yapmış kullanıcı mağazanın sahibi mi?
            if (sessionError || !sessionData.session || sessionData.session.user.id !== store.owner?.id) {
                toast({ title: "Yetkilendirme Hatası", description: "Bu işlemi yapmak için yetkiniz yok veya oturumunuz zaman aşımına uğradı.", variant: "destructive" })
                setSaving(false)
                if (!sessionData.session) router.push("/auth/login?returnTo=/magaza/" + slug + "/duzenle");
                return
            }

            const updates = {
                name: updatedStoreData.name,
                description: updatedStoreData.description,
                banner_url: updatedStoreData.banner_url || null,
                logo_url: updatedStoreData.logo_url || null,
                // Diğer güncellenecek alanlar
                updated_at: new Date().toISOString(),
            }

            const { error: updateError } = await supabase
                .from("stores")
                .update(updates)
                .eq("id", store.id) // Güncellemeyi mağaza ID'si üzerinden yapıyoruz

            if (updateError) {
                // Supabase'den dönen hatayı doğrudan fırlatıyoruz
                throw updateError
            }

            toast({ title: "Başarılı", description: "Mağaza bilgileri başarıyla güncellendi." })
            fetchStoreDetailsBySlug() // Verileri tazeleyelim
        } catch (error: any) {
            // Hata yakalandığında daha detaylı loglama ve kullanıcıya bilgi verme
            console.error("Mağaza güncellenemedi - Detaylar:", JSON.stringify(error, null, 2))
            toast({
                title: "Hata",
                description: `Mağaza güncellenemedi: ${error.message || JSON.stringify(error)}`,
                variant: "destructive"
            })
        } finally {
            setSaving(false)
        }
    }

    // Silme fonksiyonu (deleteStore) buraya eklenebilir (app/seller/stores/[id]/edit/page.tsx dosyasından uyarlanarak)

    if (loading) {
        return (
            <div className="container mx-auto py-10 flex justify-center items-center min-h-[calc(100vh-200px)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto py-10 text-center">
                <h1 className="text-2xl font-bold mb-4 text-red-600">Hata</h1>
                <p className="mb-6">{error}</p>
                <Button onClick={() => router.push("/")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Ana Sayfaya Dön
                </Button>
            </div>
        )
    }

    if (!store) {
        return (
            <div className="container mx-auto py-10 text-center">
                <h1 className="text-2xl font-bold mb-4">Mağaza Yüklenemedi</h1>
                <p className="mb-6">İstenen mağaza yüklenirken bir sorun oluştu veya bulunamadı.</p>
                <Button onClick={() => router.push("/")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Ana Sayfaya Dön
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6 md:py-10 px-4">
            <Button variant="ghost" onClick={() => router.back()} className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" /> Geri
            </Button>
            <StoreEditForm storeData={store} onSave={handleUpdateStore} saving={saving} />
            {/* Mağaza silme butonu ve AlertDialog buraya eklenebilir */}
        </div>
    )
} 