import Link from "next/link"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronRight } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function KategorilerPage() {
  const supabase = createServerComponentClient({ cookies })

  // Add error handling and retry logic for fetching categories
  let categories = []
  let error = null

  try {
    const { data, error: fetchError } = await supabase.from("categories").select("*").order("name", { ascending: true })

    if (fetchError) throw fetchError
    categories = data || []
  } catch (err: any) {
    console.error("Error fetching categories:", err)
    error = err
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Kategoriler</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          <p>Kategoriler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>
        </div>
      )}

      {categories.length === 0 && !error ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Henüz kategori bulunamadı.</p>
          <p className="text-sm text-gray-400">Kategoriler yakında eklenecektir.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link href={`/kategori/${category.slug}`} key={category.id}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-100 rounded-full p-3">
                      <img
                        src={category.image_url || `/placeholder.svg?height=40&width=40`}
                        alt={category.name}
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                    <span className="font-medium text-lg">{category.name}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
