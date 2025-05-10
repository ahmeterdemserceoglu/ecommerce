"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useAuth } from "@/hooks/use-auth";

export default function CampaignDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const supabase = createClientComponentClient();
    const [campaign, setCampaign] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        const fetchCampaign = async () => {
            setLoading(true);
            const { data: c } = await supabase
                .from("campaigns")
                .select("*")
                .eq("id", id)
                .single();
            setCampaign(c);
            if (c) {
                const { data: cps } = await supabase
                    .from("campaign_products")
                    .select("product_id, products(name, image_url)")
                    .eq("campaign_id", c.id);
                setProducts(
                    (cps || []).map((cp: any) => ({
                        id: cp.product_id,
                        name: cp.products?.name,
                        image_url: cp.products?.image_url,
                    }))
                );
            }
            setLoading(false);
        };
        fetchCampaign();
    }, [id, supabase]);

    if (loading) {
        return <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>;
    }
    if (!campaign) {
        return <div className="text-center py-12 text-red-500">Kampanya bulunamadı.</div>;
    }

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">Kampanya Detayı</h2>
                        <Link href={`/seller/campaigns/${campaign.id}/edit`}><Button variant="secondary">Düzenle</Button></Link>
                    </div>
                    <div className="mb-2 font-semibold text-lg">{campaign.name}</div>
                    <div className="text-sm text-muted-foreground mb-2">{campaign.description}</div>
                    <div className="text-xs text-gray-500 mb-1">
                        {campaign.discount_type === "percentage" && `%${campaign.discount_value} indirim`}
                        {campaign.discount_type === "amount" && `${campaign.discount_value}₺ indirim`}
                        {campaign.discount_type === "fixed_price" && `Kampanya Fiyatı: ${campaign.discount_value}₺`}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">
                        {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                    </div>
                    <div className="mb-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${campaign.is_active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                            {campaign.is_active ? "Aktif" : "Pasif"}
                        </span>
                    </div>
                    <div className="font-semibold mb-2">Kampanyadaki Ürünler</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {products.length === 0 ? (
                            <div className="text-muted-foreground">Kampanyada ürün yok.</div>
                        ) : (
                            products.map((p) => (
                                <div key={p.id} className="flex items-center gap-3 border rounded p-2 bg-gray-50">
                                    {p.image_url && <img src={p.image_url} alt={p.name} className="w-12 h-12 object-cover rounded" />}
                                    <span>{p.name}</span>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 