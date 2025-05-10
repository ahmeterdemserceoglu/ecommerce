import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/questions/[questionId]/answers - Submit a new answer to a question
export async function POST(
    request: NextRequest,
    { params }: { params: { questionId: string } }
) {
    const questionId = params.questionId
    const supabaseUserClient = createRouteHandlerClient({ cookies })

    if (!questionId) {
        return NextResponse.json({ error: 'Question ID is required' }, { status: 400 })
    }

    try {
        const { data: { user } } = await supabaseUserClient.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized. Please log in to answer.' }, { status: 401 })
        }

        // Check if the user is a seller or admin (you might have specific roles)
        // This is a basic check; you might need more sophisticated role/permission management
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profileError || !profile || !['seller', 'admin'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden. Only sellers or admins can answer questions.' }, { status: 403 })
        }

        const { answer_text } = await request.json()

        if (!answer_text || typeof answer_text !== 'string' || answer_text.trim().length < 5) {
            return NextResponse.json({ error: 'Answer text is required and must be at least 5 characters long.' }, { status: 400 })
        }

        // Verify the question exists and is not already answered by this user (optional)
        const { data: question, error: questionError } = await supabaseAdmin
            .from('product_questions')
            .select('id, product_id, is_answered') // also product_id to check if seller owns the product
            .eq('id', questionId)
            .single()

        if (questionError || !question) {
            return NextResponse.json({ error: 'Question not found.' }, { status: 404 })
        }

        // If user is a seller, check if they own the product associated with the question
        if (profile.role === 'seller') {
            const { data: productOwnerStore, error: storeError } = await supabaseAdmin
                .from('products')
                .select('store_id')
                .eq('id', question.product_id)
                .single();

            if (storeError || !productOwnerStore) {
                return NextResponse.json({ error: 'Product not found or store information missing.' }, { status: 404 });
            }

            const { data: sellerStore, error: sellerStoreError } = await supabaseAdmin
                .from('stores')
                .select('id')
                .eq('user_id', user.id)
                .eq('id', productOwnerStore.store_id)
                .maybeSingle();

            if (sellerStoreError || !sellerStore) {
                return NextResponse.json({ error: 'Forbidden. You can only answer questions for your own products.' }, { status: 403 });
            }
        }

        const { data: newAnswer, error: insertError } = await supabaseAdmin
            .from('product_answers')
            .insert({
                question_id: questionId,
                user_id: user.id, // The seller or admin user ID
                answer_text: answer_text.trim(),
                is_approved: true, // Or null/false if answers also need moderation
            })
            .select("*, user:profiles!user_id(id, full_name, avatar_url)") // return the answer with user details
            .single()

        if (insertError) {
            console.error('Error submitting answer:', insertError)
            return NextResponse.json({ error: insertError.message || 'Failed to submit answer' }, { status: 500 })
        }

        // Update the question to mark it as answered
        if (newAnswer) {
            await supabaseAdmin
                .from('product_questions')
                .update({ is_answered: true, updated_at: new Date().toISOString() })
                .eq('id', questionId)
        }

        // Optional: Notify the user who asked the question

        return NextResponse.json(newAnswer, { status: 201 })

    } catch (err: any) {
        console.error('Catch POST product answer:', err)
        if (err.name === 'SyntaxError') { // JSON parsing error
            return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
        }
        return NextResponse.json({ error: err.message || 'An unexpected error occurred' }, { status: 500 })
    }
} 