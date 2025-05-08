import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, stock_quantity, is_active, created_at")
    .eq("id", params.id)
    .single()

  if (error || !data) return notFound()

  return (
    <div className="max-w-xl mx-auto bg-white rounded shadow p-8">
      <h2 className="text-2xl font-bold mb-4">Ürün Detayı</h2>
      <div className="mb-2">
        <b>Adı:</b> {data.name}
      </div>
      <div className="mb-2">
        <b>Fiyat:</b> {data.price} ₺
      </div>
      <div className="mb-2">
        <b>Stok:</b> {data.stock_quantity}
      </div>
      <div className="mb-2">
        <b>Durum:</b> {data.is_active ? "Aktif" : "Pasif"}
      </div>
      <div className="mb-2">
        <b>Eklenme Tarihi:</b> {data.created_at}
      </div>
    </div>
  )
}
