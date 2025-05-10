import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Initialize Supabase client with service role key for admin operations if needed for specific tasks,
// but prefer user-context client for operations like posting questions.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/products/[id]/questions - Fetch questions and answers for a product
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const productId = params.id

    if (!productId) {
        return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    try {
        const { data: questions, error } = await supabaseAdmin
            .from('product_questions')
            .select(`
        id,
        question_text,
        created_at,
        is_answered,
        question_author_profile:profiles!fk_product_questions_user (id, full_name, avatar_url),
        answers:product_answers (
          id,
          answer_text,
          created_at,
          user_profile:profiles!fk_product_answers_user (id, full_name, avatar_url)
        )
      `)
            .eq('product_id', productId)
            .eq('is_approved', true) // Only fetch approved questions
            .eq('answers.is_approved', true) // Only fetch approved answers (this might need adjustment based on Supabase capabilities for nested filters)
            .order('created_at', { ascending: false })
            .order('created_at', { foreignTable: 'product_answers', ascending: true })

        if (error) {
            console.error('Error fetching product questions:', error)
            return NextResponse.json({ error: error.message || 'Failed to fetch questions' }, { status: 500 })
        }

        return NextResponse.json(questions)
    } catch (err: any) {
        console.error('Catch GET product questions:', err)
        return NextResponse.json({ error: err.message || 'An unexpected error occurred' }, { status: 500 })
    }
}

// POST /api/products/[id]/questions - Submit a new question for a product
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const productId = params.id
    const supabaseUserClient = createRouteHandlerClient({ cookies })

    if (!productId) {
        return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    try {
        const { data: { user } } = await supabaseUserClient.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized. Please log in to ask a question.' }, { status: 401 })
        }

        const { question_text } = await request.json()

        if (!question_text || typeof question_text !== 'string' || question_text.trim().length < 5) {
            return NextResponse.json({ error: 'Question text is required and must be at least 5 characters long.' }, { status: 400 })
        }

        // Check if product exists and is active/approved before allowing a question
        const { data: productExists, error: productCheckError } = await supabaseAdmin
            .from('products')
            .select('id')
            .eq('id', productId)
            .eq('is_active', true)
            .eq('is_approved', true)
            .maybeSingle()

        if (productCheckError || !productExists) {
            return NextResponse.json({ error: 'Product not found or not available for questions.' }, { status: 404 })
        }

        const { data: newQuestion, error: insertError } = await supabaseAdmin
            .from('product_questions')
            .insert({
                product_id: productId,
                user_id: user.id,
                question_text: question_text.trim(),
                is_approved: null, // Or true if auto-approved, false if moderation needed
                is_answered: false,
            })
            .select()
            .single()

        if (insertError) {
            console.error('Error submitting question:', insertError)
            return NextResponse.json({ error: insertError.message || 'Failed to submit question' }, { status: 500 })
        }

        // Optional: Trigger notification for seller/admin about new question

        return NextResponse.json(newQuestion, { status: 201 })

    } catch (err: any) {
        console.error('Catch POST product question:', err)
        if (err.name === 'SyntaxError') { // JSON parsing error
            return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
        }
        return NextResponse.json({ error: err.message || 'An unexpected error occurred' }, { status: 500 })
    }
} 