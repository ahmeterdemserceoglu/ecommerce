interface ProductVariant {
    id: string;
    price: number | null;
    discount_price?: number | null;
    stock_quantity?: number;
    sku?: string | null;
    is_default?: boolean | null;
    image_url?: string | null;
}

interface Product {
    id: string;
    name: string;
    slug: string;
    price: number;
    discount_price?: number | null;
    discount_percent?: number | null;
    has_variants?: boolean | null;
    product_variants?: ProductVariant[] | null;
    [key: string]: any; // Allow other properties
}

/**
 * Processes product data to ensure correct pricing is displayed
 * This handles variants and returns the correct price to display
 */
export function processProductData(product: Product): Product {
    if (!product) return product;

    const result = { ...product };

    // If product has no variants or variants array is empty, return the product as is
    if (!product.has_variants || !product.product_variants || product.product_variants.length === 0) {
        return result;
    }

    // For products with variants, we'll always use the variant prices
    // Filter to only include variants with valid price values
    const validVariants = product.product_variants.filter(
        variant => variant && typeof variant.price === 'number' && variant.price !== null
    );

    if (validVariants.length === 0) {
        return result; // No valid variants, return original product
    }

    // First try to find the default variant
    const defaultVariant = validVariants.find(variant => variant.is_default === true);

    if (defaultVariant) {
        // Use default variant pricing - ensure it's a number
        // This null check fixes TypeScript errors and ensures price is always a valid number
        if (defaultVariant.price !== null) {
            result.price = defaultVariant.price as number;
        }

        // Only set discount_price if it exists and is a number
        if (typeof defaultVariant.discount_price === 'number' && defaultVariant.discount_price !== null) {
            result.discount_price = defaultVariant.discount_price;
        } else {
            result.discount_price = null; // Clear the discount price if variant has none
        }
    } else {
        // If no default variant is marked, use the first valid variant's pricing
        // This null check fixes TypeScript errors and ensures price is always a valid number
        if (validVariants[0].price !== null) {
            result.price = validVariants[0].price as number;
        }

        // Only set discount_price if it exists and is a number
        if (typeof validVariants[0].discount_price === 'number' && validVariants[0].discount_price !== null) {
            result.discount_price = validVariants[0].discount_price;
        } else {
            result.discount_price = null; // Clear the discount price if variant has none
        }
    }

    return result;
}

/**
 * Calculates the discount percentage for a product
 */
export function getDiscountPercentage(product: Product): number {
    // Process the product first to ensure we have the correct price
    const processedProduct = processProductData(product);

    if (processedProduct.discount_price != null &&
        processedProduct.discount_price < processedProduct.price) {
        return Math.round(
            ((processedProduct.price - processedProduct.discount_price) / processedProduct.price) * 100
        );
    }

    return 0;
}

/**
 * Determines if a product has an active discount
 */
export function hasActiveDiscount(product: Product): boolean {
    const processedProduct = processProductData(product);
    return processedProduct.discount_price != null &&
        processedProduct.discount_price < processedProduct.price;
}

/**
 * Gets the maximum discount percentage across all variants
 */
export function getMaxDiscountPercent(product: Product): number {
    if (!product) return 0;

    let percentages = [];

    // Check main product discount
    if (product.price && product.discount_price && product.discount_price < product.price) {
        percentages.push(100 * (product.price - product.discount_price) / product.price);
    }

    // Check all variants' discounts
    if (product.product_variants && product.product_variants.length > 0) {
        for (const variant of product.product_variants) {
            if (variant.price && variant.discount_price && variant.discount_price < variant.price) {
                percentages.push(100 * (variant.price - variant.discount_price) / variant.price);
            }
        }
    }

    return percentages.length > 0 ? Math.max(...percentages) : 0;
} 