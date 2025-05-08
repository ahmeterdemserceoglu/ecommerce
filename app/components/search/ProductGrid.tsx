import { ProductCard } from "../product/ProductCard"

export default function ProductGrid({ products }: { products: any[] }) {
  if (!products || products.length === 0) {
    return <div className="text-center text-gray-500 py-12">Ürün bulunamadı.</div>
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
