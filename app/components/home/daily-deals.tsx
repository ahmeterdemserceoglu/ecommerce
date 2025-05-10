import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ProductCard } from "@/components/product/ProductCard";
import { processProductData, getMaxDiscountPercent } from "@/lib/product-utils";

export default function DailyDeals() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from("products")
                .select(`
                    *,
                    product_variants(*),
                    stores:store_id (
                        id,
                        name
                    )
                `)
                .eq("is_active", true)
                .eq("is_approved", true)
                .not("product_variants", "is", null)
                .order("created_at", { ascending: false })
                .limit(50);

            if (!data) {
                setProducts([]);
                return;
            }

            // First process all products to ensure correct pricing
            const processedProducts = data.map(product => {
                // Process with our utility function
                const processed = processProductData(product);

                // Ensure product has the correct store format
                let storeData = Array.isArray(product.stores) ? product.stores[0] : product.stores;
                const store = storeData || { name: "Bilinmeyen Mağaza" };

                return {
                    ...processed,
                    store: store
                };
            });

            // Sadece %50 ve üzeri indirimli ürünleri göster
            const flashDeals = processedProducts.filter((product) => {
                // Now we can calculate percent on the processed product with correct pricing
                const price = product.price;
                const discountPrice = product.discount_price;

                if (!price || discountPrice === null || discountPrice === undefined) {
                    return false;
                }

                const percent = ((price - discountPrice) / price) * 100;
                return percent >= 50;
            });

            console.log(`Found ${flashDeals.length} products with 50%+ discount`);
            setProducts(flashDeals);
        } catch (error) {
            console.error("Error fetching daily deals:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
        const channel = supabase
            .channel("public:products")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "products" },
                () => {
                    fetchProducts();
                }
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <div className="space-y-5">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Günün Fırsatları</h2>
            {loading ? (
                <div className="text-center py-8">Ürünler yükleniyor...</div>
            ) : products.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    Şu anda %50 ve üzeri indirimli ürün bulunmuyor.
                </div>
            )}
        </div>
    );
} 