import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const productId = params.id;
    const supabaseUserClient = createRouteHandlerClient({ cookies });

    if (!productId) {
        return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    try {
        const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
        }

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
        }

        const { reject_reason } = await request.json();
        if (!reject_reason || typeof reject_reason !== 'string' || reject_reason.trim().length < 5) {
            return NextResponse.json({ error: 'Rejection reason is required and must be at least 5 characters long.' }, { status: 400 });
        }

        const { data: updatedProduct, error: updateError } = await supabaseAdmin
            .from('products')
            .update({
                is_approved: false,
                is_active: false, // Rejected products are typically also made inactive
                reject_reason: reject_reason.trim(),
                // approved_at: null, // Keep or clear based on preference
                // approved_by: null, // Keep or clear based on preference
                updated_at: new Date().toISOString(),
                // rejected_at and rejected_by could be new fields if detailed logging is needed
            })
            .eq('id', productId)
            .select('id, name, is_approved, reject_reason, store_id')
            .single();

        if (updateError) {
            console.error('Error rejecting product:', updateError);
            if (updateError.code === 'PGRST116') { // Not found
                return NextResponse.json({ error: 'Product not found' }, { status: 404 });
            }
            return NextResponse.json({ error: updateError.message || 'Failed to reject product' }, { status: 500 });
        }

        if (!updatedProduct) {
            return NextResponse.json({ error: 'Product not found after update attempt' }, { status: 404 });
        }

        // Optional: Send notification to the seller
        if (updatedProduct.store_id) {
            const { data: storeData, error: storeError } = await supabaseAdmin
                .from('stores')
                .select('user_id')
                .eq('id', updatedProduct.store_id)
                .single();

            if (storeData && storeData.user_id) {
                await supabaseAdmin.from('notifications').insert({
                    user_id: storeData.user_id, // Seller's user ID
                    title: 'Ürününüz Reddedildi',
                    content: `Üzgünüz, "${updatedProduct.name}" adlı ürününüz yönetici tarafından reddedildi. Sebep: ${reject_reason}`,
                    type: 'product_rejected',
                    related_id: updatedProduct.id,
                    action_url: `/seller/products/${updatedProduct.id}/edit` // Link to edit page
                });
            }
        }

        return NextResponse.json({ message: 'Product rejected successfully', product: updatedProduct });

    } catch (err: any) {
        console.error('Catch POST /admin/products/[id]/reject:', err);
        if (err.name === 'SyntaxError') {
            return NextResponse.json({ error: 'Invalid request body. Rejection reason missing or malformed.' }, { status: 400 });
        }
        return NextResponse.json({ error: err.message || 'An unexpected error occurred' }, { status: 500 });
    }
} 