import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params
    const body = await req.json()
    const { data, error } = await supabase.from('products').update(body).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ message: 'Product deleted' })
} 