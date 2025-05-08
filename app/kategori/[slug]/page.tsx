import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const supabase = createServerComponentClient({ cookies })

  // Fetch the category
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", params.slug)
    .single()

  if (categoryError || !category) {
    return notFound()
  }

  // Fetch products in this category
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", category.id)
    .order("created_at", { ascending: false })

  if (productsError) {
    console.error("Error fetching products:", productsError)
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col gap-2 mb-8">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
                Ana Sayfa
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <Link href="/kategoriler" className="text-sm text-gray-500 hover:text-gray-700">
                  Kategoriler
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-sm text-gray-700">{category.name}</span>
              </div>
            </li>
          </ol>
        </nav>
        <h1 className="text-3xl font-bold">{category.name}</h1>
        {category.description && <p className="text-gray-600">{category.description}</p>}
      </div>

      {products && products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((product) => (
            <Link href={`/urun/${product.slug}`} key={product.id}>
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="aspect-square mb-4 overflow-hidden rounded-md bg-gray-100">
                    <img
                      src={product.image_url || `/placeholder.svg?height=200&width=200`}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                    />
                  </div>
                  <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <div className="text-lg font-bold">₺{product.price?.toFixed(2)}</div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="rounded-full bg-gray-100 p-6 mb-4">
            <svg
              className="h-10 w-10 text-gray-400"
              fill="none"
              height="24"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1.5" />
              <path d="M16 2v4" />
              <path d="M8 2v4" />
              <path d="M3 10h18" />
              <path d="M18 16.5V18" />
            </svg>
          </div>
          <h3 className="text-xl font-medium mb-1">Ürün Bulunamadı</h3>
          <p className="text-gray-500 mb-4">Bu kategoride henüz ürün bulunmamaktadır.</p>
          <Link href="/" className="text-primary hover:underline font-medium">
            Ana Sayfaya Dön
          </Link>
        </div>
      )}
    </div>
  )
}
