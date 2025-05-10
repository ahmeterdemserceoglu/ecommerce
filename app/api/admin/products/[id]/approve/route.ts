import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Initialize Supabase client with service role key for admin operations
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
        // 1. Verify user is authenticated and is an admin
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

        // 2. Update the product
        const { data: updatedProduct, error: updateError } = await supabaseAdmin
            .from('products')
            .update({
                is_approved: true,
                is_active: true, // Typically, an approved product also becomes active
                reject_reason: null, // Clear any previous rejection reason
                approved_at: new Date().toISOString(),
                approved_by: user.id, // Log who approved it
                updated_at: new Date().toISOString(),
            })
            .eq('id', productId)
            .select('id, name, is_approved, is_active, store_id') // Select a few fields for confirmation and notification
            .single();

        if (updateError) {
            console.error('Error approving product:', updateError);
            if (updateError.code === 'PGRST116') { // Not found
                return NextResponse.json({ error: 'Product not found' }, { status: 404 });
            }
            return NextResponse.json({ error: updateError.message || 'Failed to approve product' }, { status: 500 });
        }

        if (!updatedProduct) {
            return NextResponse.json({ error: 'Product not found after update attempt' }, { status: 404 });
        }

        // 3. Optional: Send notification to the seller
        if (updatedProduct.store_id) {
            const { data: storeData, error: storeError } = await supabaseAdmin
                .from('stores')
                .select('user_id')
                .eq('id', updatedProduct.store_id)
                .single();

            if (storeData && storeData.user_id) {
                await supabaseAdmin.from('notifications').insert({
                    user_id: storeData.user_id, // Seller's user ID
                    title: 'Ürününüz Onaylandı!',
                    content: `Tebrikler! "${updatedProduct.name}" adlı ürününüz yönetici tarafından onaylandı ve yayına alındı.`,
                    type: 'product_approved',
                    related_id: updatedProduct.id,
                    action_url: `/urun/${updatedProduct.id}` // Or product slug if available and preferred
                });
            }
        }

        return NextResponse.json({ message: 'Product approved successfully', product: updatedProduct });

    } catch (err: any) {
        console.error('Catch POST /admin/products/[id]/approve:', err);
        return NextResponse.json({ error: err.message || 'An unexpected error occurred' }, { status: 500 });
    }
} 