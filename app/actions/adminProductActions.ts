'use server';

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { cookies } from 'next/headers'; // if using createServerActionClient
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';

interface ProductIdentifier {
    id: string;
    slug?: string | null;
    store?: { slug?: string | null } | null; // This is for passing info *to* the action
}

// This interface might be more representative of what Supabase returns for joined tables
interface SupabaseFKObject {
    id: string;
    name: string;
    slug: string | null;
}

interface ApprovedProductData {
    id: string;
    name: string;
    slug: string | null;
    description?: string | null;
    price: number | null;
    discount_price?: number | null;
    stock_quantity: number | null;
    is_active: boolean;
    is_featured?: boolean | null;
    has_variants?: boolean | null;
    created_at: string;
    image_url?: string | null;
    approved?: boolean | null;
    rejected?: boolean | null;
    reject_reason?: string | null;
    user_id?: string | null;
    submitted_at?: string | null;
    approved_at?: string | null;
    approved_by?: string | null;
    rejected_at?: string | null;
    rejected_by?: string | null;
    store: SupabaseFKObject | SupabaseFKObject[] | null; // Adjusted to reflect potential array
    category: SupabaseFKObject | SupabaseFKObject[] | null; // Adjusted to reflect potential array
}

export async function approveProductAction(productInfo: ProductIdentifier, adminUserId: string) {
    const supabaseServer = createServerActionClient({ cookies });
    try {
        const updatePayload = {
            approved: true,
            is_approved: true,
            rejected: false,
            status: 'APPROVED',
            approved_at: new Date().toISOString(),
            approved_by: adminUserId,
            reject_reason: null,
            rejected_at: null,
            rejected_by: null,
        };

        const { data: rawApprovedProductData, error } = await supabaseServer
            .from("products")
            .update(updatePayload)
            .eq("id", productInfo.id)
            .select(`
              id, name, slug, description, price, discount_price, stock_quantity,
              is_active, is_featured, has_variants, created_at, image_url,
              approved, rejected, reject_reason, user_id, submitted_at, approved_at, approved_by, rejected_at, rejected_by,
              store:store_id(id, name, slug),
              category:category_id(id, name, slug)
            `)
            .single();

        if (error) throw error;
        if (!rawApprovedProductData) {
            throw new Error("Product approval failed to return data.");
        }

        // Type assertion
        const approvedProductData = rawApprovedProductData as ApprovedProductData;

        revalidatePath("/admin/products");
        revalidatePath("/");
        if (productInfo.store?.slug) {
            revalidatePath(`/magaza/${productInfo.store.slug}`);
        }
        revalidatePath("/seller/products");
        if (productInfo.slug) {
            revalidatePath(`/urun/${productInfo.slug}`);
        }

        let signedImageUrl = approvedProductData.image_url;
        if (approvedProductData.image_url && !approvedProductData.image_url.startsWith('http')) {
            const { data: signedUrlData, error: signError } = await supabaseServer.storage.from('images').createSignedUrl(approvedProductData.image_url, 3600);
            if (signError) {
                console.warn(`Failed to sign URL for approved product ${approvedProductData.image_url}:`, signError.message);
            } else {
                signedImageUrl = signedUrlData.signedUrl;
            }
        }

        // Ensure store and category are single objects
        const finalStore = Array.isArray(approvedProductData.store) ? approvedProductData.store[0] : approvedProductData.store;
        const finalCategory = Array.isArray(approvedProductData.category) ? approvedProductData.category[0] : approvedProductData.category;

        return {
            success: true,
            data: {
                ...approvedProductData,
                image_url: signedImageUrl,
                store: finalStore || null, // Ensure it's null if undefined
                category: finalCategory || null, // Ensure it's null if undefined
            },
        };
    } catch (error: any) {
        console.error("Approve Product Action Error:", error.message);
        return { success: false, error: error.message };
    }
}

export async function rejectProductAction(productInfo: ProductIdentifier, adminUserId: string, reason: string) {
    const supabaseServer = createServerActionClient({ cookies });
    try {
        const updatePayload = {
            approved: false,
            is_approved: false,
            rejected: true,
            status: 'REJECTED',
            reject_reason: reason,
            rejected_at: new Date().toISOString(),
            rejected_by: adminUserId,
            approved_at: null,
            approved_by: null,
        };

        const { data: rawRejectedProductData, error } = await supabaseServer
            .from("products")
            .update(updatePayload)
            .eq("id", productInfo.id)
            .select(`
              id, name, slug, description, price, discount_price, stock_quantity,
              is_active, is_featured, has_variants, created_at, image_url,
              approved, rejected, reject_reason, user_id, submitted_at, approved_at, approved_by, rejected_at, rejected_by,
              status, is_approved, store:store_id(id, name, slug), category:category_id(id, name, slug)
            `)
            .single();

        if (error) throw error;
        if (!rawRejectedProductData) {
            throw new Error("Product rejection failed to return data.");
        }

        const rejectedProductData = rawRejectedProductData as ApprovedProductData;

        revalidatePath("/admin/products");
        revalidatePath("/");
        if (productInfo.store?.slug) {
            revalidatePath(`/magaza/${productInfo.store.slug}`);
        }
        revalidatePath("/seller/products");
        if (productInfo.slug) {
            revalidatePath(`/urun/${productInfo.slug}`);
        }

        let signedImageUrl = rejectedProductData.image_url;
        if (rejectedProductData.image_url && !rejectedProductData.image_url.startsWith('http')) {
            const { data: signedUrlData, error: signError } = await supabaseServer.storage.from('images').createSignedUrl(rejectedProductData.image_url, 3600);
            if (signError) {
                console.warn(`Failed to sign URL for rejected product ${rejectedProductData.image_url}:`, signError.message);
            } else {
                signedImageUrl = signedUrlData.signedUrl;
            }
        }

        const finalStore = Array.isArray(rejectedProductData.store) ? rejectedProductData.store[0] : rejectedProductData.store;
        const finalCategory = Array.isArray(rejectedProductData.category) ? rejectedProductData.category[0] : rejectedProductData.category;

        return {
            success: true,
            data: {
                ...rejectedProductData,
                image_url: signedImageUrl,
                store: finalStore || null,
                category: finalCategory || null,
            },
        };
    } catch (error: any) {
        console.error("Reject Product Action Error:", error.message);
        return { success: false, error: error.message };
    }
}

// Add other actions (update, add, delete, re-evaluate) here later...

export async function deleteProductAction(productId: string) {
    const supabaseServer = createServerActionClient({ cookies });
    try {
        // First, retrieve product details to help with revalidation, especially slug and store slug
        const { data: productDetails, error: fetchError } = await supabaseServer
            .from("products")
            .select("slug, store:store_id(slug)")
            .eq("id", productId)
            .single();

        if (fetchError) {
            console.warn("Delete Product Action: Error fetching product details for revalidation:", fetchError.message);
            // Proceed with deletion even if fetching details fails for revalidation
        }

        const { error: deleteError } = await supabaseServer
            .from("products")
            .delete()
            .eq("id", productId);

        if (deleteError) throw deleteError;

        revalidatePath("/admin/products");
        revalidatePath("/");
        if (productDetails?.store && typeof productDetails.store === 'object' && 'slug' in productDetails.store && productDetails.store.slug) {
            revalidatePath(`/magaza/${productDetails.store.slug}`);
        }
        revalidatePath("/seller/products");
        if (productDetails?.slug) {
            revalidatePath(`/urun/${productDetails.slug}`);
        }
        // Also revalidate generic paths that might list products
        revalidatePath("/kategoriler");
        revalidatePath("/one-cikanlar");
        revalidatePath("/firsatlar");


        return { success: true, message: "Product deleted successfully." };
    } catch (error: any) {
        console.error("Delete Product Action Error:", error.message);
        return { success: false, error: error.message };
    }
}

export async function reevaluateProductAction(productInfo: ProductIdentifier, adminUserId: string) {
    const supabaseServer = createServerActionClient({ cookies });
    try {
        const updatePayload = {
            approved: null,
            is_approved: false, // Explicitly set is_approved to false
            rejected: false,
            status: 'PENDING_APPROVAL',
            reject_reason: null,
            rejected_at: null,
            rejected_by: null,
            approved_at: null,
            approved_by: null,
            // Optionally, you might want to log who re-evaluated and when
            // last_evaluated_by: adminUserId,
            // last_evaluated_at: new Date().toISOString(),
        };

        const { data: rawReevaluatedProductData, error } = await supabaseServer
            .from("products")
            .update(updatePayload)
            .eq("id", productInfo.id)
            .select(`
              id, name, slug, description, price, discount_price, stock_quantity,
              is_active, is_featured, has_variants, created_at, image_url,
              approved, rejected, reject_reason, user_id, submitted_at, approved_at, approved_by, rejected_at, rejected_by,
              status, is_approved, store:store_id(id, name, slug), category:category_id(id, name, slug)
            `)
            .single();

        if (error) throw error;
        if (!rawReevaluatedProductData) {
            throw new Error("Product re-evaluation failed to return data.");
        }

        const reevaluatedProductData = rawReevaluatedProductData as ApprovedProductData; // Using existing type

        revalidatePath("/admin/products");
        revalidatePath("/");
        if (productInfo.store?.slug) {
            revalidatePath(`/magaza/${productInfo.store.slug}`);
        }
        revalidatePath("/seller/products");
        if (productInfo.slug) {
            revalidatePath(`/urun/${productInfo.slug}`);
        }

        let signedImageUrl = reevaluatedProductData.image_url;
        if (reevaluatedProductData.image_url && !reevaluatedProductData.image_url.startsWith('http')) {
            const { data: signedUrlData, error: signError } = await supabaseServer.storage.from('images').createSignedUrl(reevaluatedProductData.image_url, 3600);
            if (signError) {
                console.warn(`Failed to sign URL for re-evaluated product ${reevaluatedProductData.image_url}:`, signError.message);
            } else {
                signedImageUrl = signedUrlData.signedUrl;
            }
        }

        const finalStore = Array.isArray(reevaluatedProductData.store) ? reevaluatedProductData.store[0] : reevaluatedProductData.store;
        const finalCategory = Array.isArray(reevaluatedProductData.category) ? reevaluatedProductData.category[0] : reevaluatedProductData.category;

        return {
            success: true,
            data: {
                ...reevaluatedProductData,
                image_url: signedImageUrl,
                store: finalStore || null,
                category: finalCategory || null,
            },
        };
    } catch (error: any) {
        console.error("Re-evaluate Product Action Error:", error.message);
        return { success: false, error: error.message };
    }
} 