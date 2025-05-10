import { NextResponse, NextRequest } from "next/server";
import { createClient } from '@supabase/supabase-js'
import * as z from "zod";
import { slugify } from "@/lib/utils";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'; // Route Handler'ı dinamik yap

// Zod schema for store creation (can be used by admin)
const storeCreateSchema = z.object({
    name: z.string().min(3, "Store name must be at least 3 characters."),
    user_id: z.string().uuid("A valid owner user ID must be provided."), // Admin needs to assign an owner
    description: z.string().optional().nullable(),
    slug: z.string().optional(), // Auto-generated if missing
    logo_url: z.string().url().optional().nullable(),
    banner_url: z.string().url().optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    contact_email: z.string().email().optional().nullable(),
    contact_phone: z.string().optional().nullable(),
    commission_rate: z.number().min(0).max(100).optional().default(0), // Example default commission
    is_active: z.boolean().optional().default(true), // Admin created stores can be active by default
    is_verified: z.boolean().optional().default(false),
    // verification_status: z.enum(['pending', 'approved', 'rejected']).default('pending'), // Add if this column exists
    is_featured: z.boolean().optional().default(false),
});

// GET /api/admin/stores - List all stores (Admin only)
export async function GET(req: NextRequest) {
    // List all stores
    const { data, error } = await supabase.from('stores').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ stores: data })
}

// POST /api/admin/stores - Create a new store (Admin only)
export async function POST(req: NextRequest) {
    // Create a new store
    const body = await req.json()
    const { data, error } = await supabase.from('stores').insert([body]).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
} 