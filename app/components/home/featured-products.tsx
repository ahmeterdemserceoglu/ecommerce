import { ProductCard } from "@/components/product/ProductCard";

interface Product {
    id: string;
    name: string;
    slug: string;
    price: number;
    discount_price?: number | null;
    store?: {
        name: string;
    };
    rating?: number;
    review_count?: number;
    image_url?: string | null;
    product_variants?: any[] | null;
    has_variants?: boolean | null;
}

interface FeaturedProductsProps {
    products: Product[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
    // No need to fetch products anymore as they're passed as props and already processed

    return (
        <div className="space-y-5">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Öne Çıkan Ürünler</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
} 