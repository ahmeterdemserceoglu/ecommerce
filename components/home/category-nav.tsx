"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export function CategoryNav() {
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase
      .from("categories")
      .select("id, name, slug")
      .is("parent_id", null)
      .order("sort_order", { ascending: true })
      .limit(12)
      .then(({ data }) => {
        setCategories(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <nav className="w-full border-b bg-white">
      <div className="flex items-center gap-6 px-6 py-2 overflow-x-auto scrollbar-none">
        {loading ? (
          <span>Kategoriler yükleniyor...</span>
        ) : categories.length > 0 ? (
          categories.map((category) => (
            <Link
              key={category.id}
              href={`/kategori/${category.slug}`}
              className="text-base font-medium text-gray-700 hover:text-orange-600 hover:underline underline-offset-8 transition-colors whitespace-nowrap"
            >
              {category.name}
            </Link>
          ))
        ) : (
          <div className="text-sm text-gray-500 px-3 py-1.5">Henüz kategori bulunamadı</div>
        )}
      </div>
    </nav>
  );
}
