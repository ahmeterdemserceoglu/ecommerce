"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useAuth } from "@/hooks/use-auth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ticket } from "lucide-react"

export default function KuponlarimPage() {
    const supabase = createClientComponentClient()
    const { user } = useAuth() || { user: null }
    const [couponInput, setCouponInput] = useState("")
    const [couponStatus, setCouponStatus] = useState<string | null>(null)
    const [userCoupons, setUserCoupons] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    // Kullanıcının kuponlarını çek
    useEffect(() => {
        if (!user) return
        const fetchCoupons = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from("user_coupons")
                .select("id, created_at, coupons:coupon_id(*)")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
            setUserCoupons(data || [])
            setLoading(false)
        }
        fetchCoupons()
    }, [user, supabase])

    // Kupon ekle
    const handleAddCoupon = async () => {
        setCouponStatus(null)
        if (!couponInput.trim()) {
            setCouponStatus("Lütfen bir kupon kodu girin.")
            return
        }
        try {
            // Kuponu bul
            const { data: coupon, error: couponError } = await supabase
                .from("coupons")
                .select("id, code, is_active")
                .eq("code", couponInput.trim().toUpperCase())
                .eq("is_active", true)
                .maybeSingle()
            if (couponError || !coupon) {
                setCouponStatus("Geçersiz veya aktif olmayan kupon kodu.")
                return
            }
            // Kullanıcıya daha önce eklenmiş mi?
            const { data: userCoupon } = await supabase
                .from("user_coupons")
                .select("id")
                .eq("user_id", user.id)
                .eq("coupon_id", coupon.id)
                .maybeSingle()
            if (userCoupon) {
                setCouponStatus("Bu kupon zaten hesabınıza eklenmiş.")
                return
            }
            // Hesaba ekle
            const { error: insertError } = await supabase
                .from("user_coupons")
                .insert({ user_id: user.id, coupon_id: coupon.id })
            if (insertError) {
                setCouponStatus("Kupon eklenirken bir hata oluştu.")
                return
            }
            setCouponStatus("Kupon başarıyla hesabınıza eklendi!")
            setCouponInput("")
            // Listeyi güncelle
            const { data: updatedCoupons } = await supabase
                .from("user_coupons")
                .select("id, created_at, coupons:coupon_id(*)")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
            setUserCoupons(updatedCoupons || [])
        } catch (err) {
            setCouponStatus("Bir hata oluştu. Lütfen tekrar deneyin.")
        }
    }

    return (
        <div className="max-w-2xl mx-auto py-10 px-4">
            <Card>
                <CardHeader>
                    <CardTitle>
                        <Ticket className="inline-block mr-2" /> Kuponlarım
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-1">Kupon Kodu Ekle</label>
                        <div className="flex gap-2 items-center">
                            <Input
                                placeholder="Kupon kodu girin"
                                value={couponInput}
                                onChange={e => {
                                    setCouponInput(e.target.value.toUpperCase());
                                    setCouponStatus(null);
                                }}
                                onKeyDown={e => { if (e.key === "Enter") handleAddCoupon(); }}
                                className="flex-grow"
                            />
                            <Button onClick={handleAddCoupon} className="bg-orange-500 hover:bg-orange-600">Ekle</Button>
                        </div>
                        {couponStatus && (
                            <div className={`mt-2 text-sm ${couponStatus.includes("başarı") ? "text-green-600" : "text-red-600"}`}>{couponStatus}</div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Hesabınızdaki Kuponlar</h3>
                        {loading ? (
                            <div>Yükleniyor...</div>
                        ) : userCoupons.length === 0 ? (
                            <div className="text-gray-500">Henüz hesabınıza eklenmiş bir kupon yok.</div>
                        ) : (
                            <ul className="space-y-3">
                                {userCoupons.map((uc) => (
                                    <li key={uc.id} className="border rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <span className="font-bold text-orange-600 text-lg mr-2">{uc.coupons?.code}</span>
                                            <span className="text-sm text-gray-600">{uc.coupons?.description}</span>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-2 md:mt-0">Eklenme: {uc.created_at ? new Date(uc.created_at).toLocaleString("tr-TR") : "-"}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
} 