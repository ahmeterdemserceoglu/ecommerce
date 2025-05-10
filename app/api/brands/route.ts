import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

// Note: Using service role key here for direct DB access on the server-side.
// Ensure this is handled securely and ideally abstracted further in a production scenario.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Ensure this env var is set
)

export async function GET(request: Request) {
    try {
        const { data, error } = await supabaseAdmin
            .from('brands')
            .select('*')
            .order('name', { ascending: true })

        if (error) {
            console.error('Error fetching brands:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (err: any) {
        console.error('Catch GET brands:', err)
        return NextResponse.json({ error: err.message || 'Failed to fetch brands' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const { name, description, logo_url, slug } = await request.json()

        if (!name || !slug) {
            return NextResponse.json({ error: 'Brand name and slug are required' }, { status: 400 })
        }

        // Optional: Check if user is authenticated and has permission to create brands
        // This would typically involve getting the user session

        const { data, error } = await supabaseAdmin
            .from('brands')
            .insert([{ name, slug, description, logo_url, is_active: true }]) // Assuming new brands are active by default
            .select()
            .single()

        if (error) {
            console.error('Error creating brand:', error)
            // Handle potential duplicate slug error (e.g., if slug has a unique constraint)
            if (error.code === '23505') { // Unique violation
                return NextResponse.json({ error: 'Brand with this name or slug already exists.' }, { status: 409 })
            }
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data, { status: 201 })
    } catch (err: any) {
        console.error('Catch POST brand:', err)
        return NextResponse.json({ error: err.message || 'Failed to create brand' }, { status: 500 })
    }
} 