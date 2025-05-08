import Link from "next/link"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function CategoryNav() {
  const supabase = createServerComponentClient({ cookies })

  type Category = { id: string; name: string; slug: string }
  let categories: Category[] = []

  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug")
      .is("parent_id", null)
      .order("sort_order", { ascending: true })
      .limit(12)

    if (error) throw error
    categories = data || []
  } catch (err) {
    console.error("Error fetching categories for nav:", err)
    // Return empty array on error to avoid breaking the UI
    categories = []
  }

  return (
    <nav className="w-full border-b bg-white">
      <div className="flex items-center gap-6 px-6 py-2 overflow-x-auto scrollbar-none">
        {categories.length > 0 ? (
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
  )
}
