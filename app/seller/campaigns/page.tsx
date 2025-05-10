"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useAuth } from "@/hooks/use-auth";

export default function SellerCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!user) return;
    const fetchCampaigns = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("store_id", user.store_id)
        .order("created_at", { ascending: false });
      setCampaigns(data || []);
      setLoading(false);
    };
    fetchCampaigns();
  }, [user, supabase]);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kampanyalarım</h1>
        <Link href="/seller/campaigns/new">
          <Button variant="primary">+ Yeni Kampanya</Button>
        </Link>
      </div>
      {loading ? (
        <div className="text-center text-muted-foreground">Yükleniyor...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center text-muted-foreground">Henüz kampanya yok.</div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c) => (
            <Card key={c.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <div className="font-semibold text-lg">{c.name}</div>
                  <div className="text-sm text-muted-foreground mb-1">{c.description}</div>
                  <div className="text-xs text-gray-500">
                    {c.discount_type === "percentage" && `%${c.discount_value} indirim`}
                    {c.discount_type === "amount" && `${c.discount_value}₺ indirim`}
                    {c.discount_type === "fixed_price" && `Kampanya Fiyatı: ${c.discount_value}₺`}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(c.start_date).toLocaleDateString()} - {new Date(c.end_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/seller/campaigns/${c.id}`}><Button variant="outline">Detay</Button></Link>
                  <Link href={`/seller/campaigns/${c.id}/edit`}><Button variant="secondary">Düzenle</Button></Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 