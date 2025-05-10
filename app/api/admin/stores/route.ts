import { NextResponse, NextRequest } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import * as z from "zod";
import { slugify } from "@/lib/utils";

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
export async function GET(request: NextRequest) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
        console.error("[API /api/admin/stores GET] Error getting session:", sessionError.message);
        return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 });
    }

    if (!session) {
        console.log("[API /api/admin/stores GET] No session found.");
        return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 });
    }

    // Fetch requesting user's profile to check admin role
    const { data: adminProfile, error: adminProfileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (adminProfileError) {
        console.error(`[API /api/admin/stores GET] Error fetching admin profile ${session.user.id}:`, adminProfileError.message);
        return NextResponse.json({ error: "Failed to verify admin privileges." }, { status: 500 });
    }
    if (!adminProfile || adminProfile.role !== 'admin') {
        console.warn(`[API /api/admin/stores GET] Authorization failed. User role: ${adminProfile?.role} (Expected 'admin')`);
        return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 });
    }

    console.log(`[API /api/admin/stores GET] Admin user ${session.user.id} authorized.`);

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const offset = (page - 1) * limit;
    const searchTerm = searchParams.get("searchTerm") || "";
    const isActiveFilter = searchParams.get("is_active");
    const isVerifiedFilter = searchParams.get("is_verified");
    const verificationStatusFilter = searchParams.get("verification_status");

    try {
        let query = supabase
            .from("stores")
            .select(
                "*, owner:profiles!stores_owner_id_fkey(id, full_name, email)",
                { count: "exact" }
            )

        // Apply filters
        if (isActiveFilter === "true") query = query.eq("is_active", true);
        else if (isActiveFilter === "false") query = query.eq("is_active", false);

        if (isVerifiedFilter === "true") query = query.eq("is_verified", true);
        else if (isVerifiedFilter === "false") query = query.eq("is_verified", false);

        // Add verification_status filter only if the column exists in your 'stores' table
        if (verificationStatusFilter && ["pending", "approved", "rejected"].includes(verificationStatusFilter)) {
            // Ensure your stores table has a 'verification_status' column of text type
            // query = query.eq("verification_status", verificationStatusFilter);
            console.warn("[API /api/admin/stores GET] Filtering by 'verification_status' is commented out. Uncomment if the column exists.")
        }

        // Apply search term 
        if (searchTerm) {
            const searchString = `%${searchTerm}%`;
            // Search on store name and description. Searching owner requires more complex query or view.
            query = query.or(`name.ilike.${searchString},description.ilike.${searchString}`);
            console.warn("[API /api/admin/stores GET] Search currently only applies to store name and description.")
        }

        // Apply ordering and pagination
        query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

        const { data: stores, error, count } = await query;

        if (error) {
            console.error("[API /api/admin/stores GET] Error fetching stores:", error);
            return NextResponse.json({ error: "Failed to fetch stores. " + error.message }, { status: 500 });
        }

        // Return data in standardized format
        return NextResponse.json({
            stores,
            totalPages: Math.ceil((count || 0) / limit),
            currentPage: page,
            totalStores: count || 0,
        });
    } catch (e: any) {
        console.error("[API /api/admin/stores GET] Unexpected error:", e);
        return NextResponse.json({ error: e.message || "Failed to fetch stores" }, { status: 500 });
    }
}

// POST /api/admin/stores - Create a new store (Admin only)
export async function POST(request: NextRequest) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
        // Handle session error or no session
        return NextResponse.json({ error: "Unauthorized: Invalid session." }, { status: 401 });
    }

    // Fetch requesting user's profile to check admin role
    const { data: adminProfile, error: adminProfileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (adminProfileError || !adminProfile || adminProfile.role !== 'admin') {
        // Handle profile error or non-admin role
        return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 });
    }

    console.log(`[API /api/admin/stores POST] Admin user ${session.user.id} authorized.`);

    try {
        const body = await request.json();
        const validation = storeCreateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: "Invalid store data", details: validation.error.format() }, { status: 400 });
        }

        let storeData = validation.data;

        // Check if owner user_id exists
        const { data: ownerProfile, error: ownerError } = await supabase
            .from("profiles")
            .select("id, role")
            .eq("id", storeData.user_id)
            .single();

        if (ownerError || !ownerProfile) {
            return NextResponse.json({ error: "Owner user ID not found." }, { status: 404 });
        }
        // Update owner role to seller if not already
        if (ownerProfile.role !== 'seller') {
            const { error: roleUpdateError } = await supabase
                .from('profiles')
                .update({ role: 'seller', updated_at: new Date().toISOString() })
                .eq('id', storeData.user_id);
            if (roleUpdateError) console.error(`Failed to update role for user ${storeData.user_id}:`, roleUpdateError);
            else console.log(`User ${storeData.user_id} role updated to 'seller'.`);
        }

        // Generate unique slug
        let slug = storeData.slug || slugify(storeData.name);
        let slugExists = true;
        let slugSuffix = 1;
        const originalSlugBase = slugify(storeData.name);
        while (slugExists) {
            const { data: existingStore, error: slugError } = await supabase
                .from("stores").select("id").eq("slug", slug).maybeSingle();
            if (slugError) throw slugError;
            if (!existingStore) slugExists = false;
            else { slug = `${originalSlugBase}-${slugSuffix++}`; }
        }
        storeData.slug = slug;

        // Add verification_status if schema supports it
        // const storeDataToInsert = { ...storeData, verification_status: 'pending' }; // Example

        const { data: newStore, error: insertError } = await supabase
            .from("stores")
            .insert(storeData)
            .select("*, owner:profiles!stores_owner_id_fkey(id, full_name, email)")
            .single();

        if (insertError) {
            console.error("Error creating store (admin):", insertError);
            if (insertError.code === '23505') {
                return NextResponse.json({ error: "Store creation failed due to unique constraint.", details: insertError.detail }, { status: 409 });
            }
            return NextResponse.json({ error: insertError.message || "Failed to create store." }, { status: 500 });
        }

        return NextResponse.json(newStore, { status: 201 });

    } catch (e: any) {
        console.error("POST /api/admin/stores error:", e);
        if (e.code === '23503' && e.constraint === 'stores_user_id_fkey') {
            return NextResponse.json({ error: "Invalid owner user ID provided." }, { status: 400 });
        }
        return NextResponse.json({ error: e.message || "Failed to create store" }, { status: 500 });
    }
} 