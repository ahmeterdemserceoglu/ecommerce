"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useAuth } from "@/hooks/use-auth";

const DISCOUNT_TYPES = [
    { value: "percentage", label: "% Yüzde" },
    { value: "amount", label: "₺ Tutar" },
    { value: "fixed_price", label: "Sabit Fiyat" },
];

export default function NewCampaignPage() {
    const { user } = useAuth();
    const supabase = createClientComponentClient();
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [form, setForm] = useState({
        name: "",
        description: "",
        discount_type: "percentage",
        discount_value: "",
        start_date: "",
        end_date: "",
        is_active: true,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [storeId, setStoreId] = useState<string | null>(null);
    const [storeLoading, setStoreLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchStoreId = async () => {
            setStoreLoading(true);
            // Try to get store_id from user context first
            if ((user as any).store_id) {
                setStoreId((user as any).store_id);
                setStoreLoading(false);
                return;
            }
            // Otherwise, fetch from sellers table
            const { data, error } = await supabase
                .from("sellers")
                .select("store_id")
                .eq("user_id", user.id)
                .single();
            setStoreId(data?.store_id || null);
            setStoreLoading(false);
        };
        fetchStoreId();
    }, [user, supabase]);

    useEffect(() => {
        if (!storeId) return;
        const fetchProducts = async () => {
            const { data } = await supabase
                .from("products")
                .select("id, name")
                .eq("store_id", storeId)
                .eq("is_active", true);
            setProducts(data || []);
        };
        fetchProducts();
    }, [storeId, supabase]);

    const handleChange = (e: any) => {
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    };

    const handleProductToggle = (id: string) => {
        setSelectedProducts((prev) =>
            prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (!storeId) throw new Error("Mağaza bulunamadı.");
            const { data: campaign, error: campaignError } = await supabase
                .from("campaigns")
                .insert({
                    ...form,
                    discount_value: Number(form.discount_value),
                    store_id: storeId,
                })
                .select()
                .single();
            if (campaignError) throw campaignError;
            if (selectedProducts.length > 0) {
                const campaignProducts = selectedProducts.map((pid) => ({
                    campaign_id: campaign.id,
                    product_id: pid,
                }));
                const { error: cpError } = await supabase
                    .from("campaign_products")
                    .insert(campaignProducts);
                if (cpError) throw cpError;
            }
            router.push("/seller/campaigns");
        } catch (err: any) {
            setError(err.message || "Kampanya kaydedilemedi.");
        } finally {
            setLoading(false);
        }
    };

    if (storeLoading) {
        return <div className="text-center py-12 text-muted-foreground">Mağaza bilgisi yükleniyor...</div>;
    }
    if (!storeId) {
        return <div className="text-center py-12 text-red-500">Mağaza bulunamadı. Lütfen profilinizi kontrol edin.</div>;
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <Card>
                <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-4">Yeni Kampanya Oluştur</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input name="name" placeholder="Kampanya Adı" value={form.name} onChange={handleChange} required />
                        <Textarea name="description" placeholder="Açıklama" value={form.description} onChange={handleChange} />
                        <div className="flex gap-2">
                            <select name="discount_type" value={form.discount_type} onChange={handleChange} className="border rounded px-2 py-1">
                                {DISCOUNT_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                            <Input name="discount_value" type="number" placeholder="İndirim Değeri" value={form.discount_value} onChange={handleChange} required min={0} />
                        </div>
                        <div className="flex gap-2">
                            <Input name="start_date" type="date" value={form.start_date} onChange={handleChange} required />
                            <Input name="end_date" type="date" value={form.end_date} onChange={handleChange} required />
                        </div>
                        <div>
                            <div className="font-semibold mb-2">Kampanyaya Eklenecek Ürünler</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                {products.map((p) => (
                                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedProducts.includes(p.id)}
                                            onChange={() => handleProductToggle(p.id)}
                                        />
                                        <span>{p.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        {error && <div className="text-red-500 text-sm">{error}</div>}
                        <Button type="submit" disabled={loading} className="w-full mt-2">
                            {loading ? "Kaydediliyor..." : "Kampanya Oluştur"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
} 