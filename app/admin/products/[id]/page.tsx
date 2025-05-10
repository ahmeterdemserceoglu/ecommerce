import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

// Basic UUID validation regex
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  await Promise.resolve(); // Force an async tick

  const { id } = params;

  if (!id || !UUID_REGEX.test(id)) { // Validate if ID is a UUID
    console.warn(`ProductDetailPage: Invalid or missing ID: ${id}`);
    return notFound();
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, stock_quantity, is_active, created_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error(`Error fetching product details for ID ${id}:`, error);
    return notFound();
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded shadow p-8">
      <h2 className="text-2xl font-bold mb-4">Ürün Detayı: {data.name}</h2>
      <div className="mb-2">
        <b>ID:</b> {data.id}
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
        <b>Eklenme Tarihi:</b> {new Date(data.created_at).toLocaleDateString('tr-TR')}
      </div>
    </div>
  );
}
