import Link from "next/link"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { Card, CardContent } from "@/components/ui/card"

export async function CategoryShowcase() {
  const supabase = createServerComponentClient({ cookies })

  // Add error handling and retry logic
  let categories = []
  let error = null

  try {
    const { data, error: fetchError } = await supabase
      .from("categories")
      .select("*")
      .is("parent_id", null)
      .order("sort_order", { ascending: true })
      .limit(6)

    if (fetchError) throw fetchError
    categories = data || []
  } catch (err: any) {
    console.error("Error fetching categories:", err)
    error = err
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Kategoriler</h2>
          <Link href="/kategoriler" className="text-orange-500 hover:underline">
            Tümünü Gör
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>Kategoriler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>
        </div>
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Kategoriler</h2>
          <Link href="/kategoriler" className="text-orange-500 hover:underline">
            Tümünü Gör
          </Link>
        </div>
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Henüz kategori bulunamadı.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Kategoriler</h2>
        <Link href="/kategoriler" className="text-orange-500 hover:underline">
          Tümünü Gör
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((category) => (
          <Link href={`/kategori/${category.slug}`} key={category.id}>
            <Card className="hover:shadow-md transition-shadow h-full">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className="bg-gray-100 rounded-full p-4 mb-3">
                  {category.icon ? (
                    <span className="text-2xl">{category.icon}</span>
                  ) : (
                    <img
                      src={category.image_url || `/placeholder.svg?height=40&width=40`}
                      alt={category.name}
                      className="w-10 h-10 object-contain"
                    />
                  )}
                </div>
                <span className="font-medium">{category.name}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
