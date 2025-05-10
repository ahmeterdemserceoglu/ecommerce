import { NextResponse, NextRequest } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import * as z from "zod";
import { slugify } from "@/lib/utils";

// Zod schema for admin updating a store
const adminStoreUpdateSchema = z.object({
    name: z.string().min(3).optional(),
    user_id: z.string().uuid("Invalid owner user ID.").optional(), // Allow admin to reassign owner
    description: z.string().optional().nullable(),
    slug: z.string().optional(),
    logo_url: z.string().url().optional().nullable(),
    banner_url: z.string().url().optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    contact_email: z.string().email().optional().nullable(),
    contact_phone: z.string().optional().nullable(),
    commission_rate: z.number().min(0).max(100).optional(),
    is_active: z.boolean().optional(),
    is_verified: z.boolean().optional(),
    approved: z.boolean().optional(), // Added approved to schema for verify action
    is_featured: z.boolean().optional(),
    verification_notes: z.string().optional().nullable(), // Admin notes for verification
});

// GET /api/admin/stores/[storeId] - Get a specific store by ID (Admin only)
export async function GET(request: NextRequest, { params }: { params: { storeId: string } }) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { storeId } = params;

    // Admin authorization check
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        console.error("[API /api/admin/stores/[id] GET] Error getting session:", sessionError.message);
        return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 });
    }
    if (!session) {
        console.log("[API /api/admin/stores/[id] GET] No session found.");
        return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 });
    }
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
    if (profileError) {
        console.error(`[API /api/admin/stores/[id] GET] Error fetching profile for user ${session.user.id}:`, profileError.message);
        return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 });
    }
    if (!profile || profile.role !== 'admin') {
        console.warn(`[API /api/admin/stores/[id] GET] Authorization failed. User role: ${profile?.role} (Expected 'admin')`);
        return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 });
    }
    console.log(`[API /api/admin/stores/[id] GET] Admin user ${session.user.id} authorized.`);
    // End admin authorization check

    try {
        const { data: store, error } = await supabase
            .from("stores")
            .select("*, owner:profiles!stores_owner_id_fkey(id, full_name, email), products(count)") // Corrected FK hint
            .eq("id", storeId)
            .single();

        if (error) {
            if (error.code === "PGRST116") { // Not found
                return NextResponse.json({ error: "Store not found." }, { status: 404 });
            }
            console.error(`Error fetching store ${storeId} (admin):`, error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(store);
    } catch (e: any) {
        console.error(`GET /api/admin/stores/${storeId} error:`, e);
        return NextResponse.json({ error: e.message || "Failed to fetch store" }, { status: 500 });
    }
}

// PUT /api/admin/stores/[storeId] - Update a specific store by ID (Admin only)
export async function PUT(request: NextRequest, { params }: { params: { storeId: string } }) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { storeId } = params;

    // Admin authorization check
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        console.error("[API /api/admin/stores/[id] PUT] Error getting session:", sessionError.message);
        return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 });
    }
    if (!session) {
        console.log("[API /api/admin/stores/[id] PUT] No session found.");
        return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 });
    }
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
    if (profileError) {
        console.error(`[API /api/admin/stores/[id] PUT] Error fetching profile for user ${session.user.id}:`, profileError.message);
        return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 });
    }
    if (!profile || profile.role !== 'admin') {
        console.warn(`[API /api/admin/stores/[id] PUT] Authorization failed. User role: ${profile?.role} (Expected 'admin')`);
        return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 });
    }
    console.log(`[API /api/admin/stores/[id] PUT] Admin user ${session.user.id} authorized.`);
    // End admin authorization check

    try {
        // Fetch current store to compare if needed (e.g., check if owner is changing)
        const { data: currentStore, error: fetchError } = await supabase
            .from("stores")
            .select("user_id, slug, name")
            .eq("id", storeId)
            .single();

        if (fetchError) {
            return NextResponse.json({ error: "Store not found to update." }, { status: 404 });
        }

        const body = await request.json();
        const validation = adminStoreUpdateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: "Invalid store data for update", details: validation.error.format() }, { status: 400 });
        }

        let storeDataToUpdate = validation.data;

        // Check if new owner user_id exists if it's being changed
        if (storeDataToUpdate.user_id && storeDataToUpdate.user_id !== currentStore.user_id) {
            const { data: ownerProfile, error: ownerError } = await supabase
                .from("profiles")
                .select("id, role") // Select role to check if update is needed
                .eq("id", storeDataToUpdate.user_id)
                .single();
            if (ownerError || !ownerProfile) {
                return NextResponse.json({ error: "New owner user ID not found." }, { status: 400 });
            }
            // Update new owner's role to seller if they aren't already
            if (ownerProfile.role !== 'seller') {
                const { error: roleUpdateError } = await supabase
                    .from('profiles')
                    .update({ role: 'seller', updated_at: new Date().toISOString() })
                    .eq('id', storeDataToUpdate.user_id);
                if (roleUpdateError) {
                    console.error(`Failed to update new owner ${storeDataToUpdate.user_id} role to seller:`, roleUpdateError);
                    // Non-blocking, but log it
                } else {
                    console.log(`New owner ${storeDataToUpdate.user_id} role updated to seller.`);
                }
            }
            // TODO: Consider implications of changing store owner (products, payouts, etc.)
            // TODO: Consider if old owner's role needs changing (e.g., if they have no other stores)
        }

        // Handle slug update if name is changed and slug wasn't provided explicitly
        if (storeDataToUpdate.name && !storeDataToUpdate.slug && storeDataToUpdate.name !== currentStore.name) {
            let newSlug = slugify(storeDataToUpdate.name);
            let slugExists = true;
            let slugSuffix = 1;
            while (slugExists) {
                const { data: existingStoreWithSlug } = await supabase
                    .from("stores")
                    .select("id")
                    .eq("slug", newSlug)
                    .neq("id", storeId)
                    .maybeSingle();
                if (!existingStoreWithSlug) {
                    slugExists = false;
                } else {
                    newSlug = `${slugify(storeDataToUpdate.name)}-${slugSuffix}`;
                    slugSuffix++;
                }
            }
            storeDataToUpdate.slug = newSlug;
        }

        // Add updated_at timestamp
        storeDataToUpdate.updated_at = new Date().toISOString();

        // Update the store
        const { data: updatedStore, error: updateError } = await supabase
            .from("stores")
            .update(storeDataToUpdate)
            .eq("id", storeId)
            .select("*, owner:profiles!stores_owner_id_fkey(id, full_name, email)") // Corrected FK hint
            .single();

        if (updateError) {
            console.error(`Error updating store ${storeId} (admin):`, updateError);
            if (updateError.code === '23505') { // Unique constraint
                return NextResponse.json({ error: "Update failed due to unique constraint (slug or user_id?).", details: updateError.detail }, { status: 409 });
            }
            if (updateError.code === '23503') { // FK constraint (e.g., invalid user_id)
                return NextResponse.json({ error: "Invalid owner user ID provided.", details: updateError.detail }, { status: 400 });
            }
            return NextResponse.json({ error: updateError.message || "Failed to update store." }, { status: 500 });
        }

        if (!updatedStore) {
            return NextResponse.json({ error: "Store not found after update." }, { status: 404 });
        }

        // TODO: Send notification to store owner if admin made changes?

        return NextResponse.json(updatedStore);

    } catch (e: any) {
        console.error(`PUT /api/admin/stores/${storeId} error:`, e);
        return NextResponse.json({ error: e.message || "Failed to update store" }, { status: 500 });
    }
}

// DELETE /api/admin/stores/[storeId] - Delete a specific store by ID (Admin only)
export async function DELETE(request: NextRequest, { params }: { params: { storeId: string } }) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { storeId } = params;

    // Admin authorization check
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        console.error("[API /api/admin/stores/[id] DELETE] Error getting session:", sessionError.message);
        return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 });
    }
    if (!session) {
        console.log("[API /api/admin/stores/[id] DELETE] No session found.");
        return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 });
    }
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
    if (profileError) {
        console.error(`[API /api/admin/stores/[id] DELETE] Error fetching profile for user ${session.user.id}:`, profileError.message);
        return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 });
    }
    if (!profile || profile.role !== 'admin') {
        console.warn(`[API /api/admin/stores/[id] DELETE] Authorization failed. User role: ${profile?.role} (Expected 'admin')`);
        return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 });
    }
    console.log(`[API /api/admin/stores/[id] DELETE] Admin user ${session.user.id} authorized.`);
    // End admin authorization check

    try {
        // Perform a soft delete by updating status fields
        const updates = {
            is_active: false,
            is_verified: false,
            approved: false,
            updated_at: new Date().toISOString(),
        };

        const { data: softDeletedStore, error: updateError } = await supabase
            .from("stores")
            .update(updates)
            .eq("id", storeId)
            .select("id") // Select only necessary fields
            .single();

        if (updateError) {
            console.error(`Error soft deleting store ${storeId} (admin):`, updateError);
            // PGRST116 means not found, which is okay if we are trying to delete something already gone.
            if (updateError.code === 'PGRST116') {
                return NextResponse.json({ message: `Store ${storeId} not found or already processed.` }, { status: 404 });
            }
            return NextResponse.json({ error: updateError.message || "Failed to soft delete store." }, { status: 500 });
        }

        if (!softDeletedStore) {
            // This case should ideally be caught by PGRST116, but as a fallback:
            return NextResponse.json({ error: "Store not found to soft delete." }, { status: 404 });
        }

        console.log(`Store ${storeId} soft deleted successfully.`);
        return NextResponse.json({ message: `Store ${storeId} has been deactivated and archived.` });

    } catch (e: any) {
        console.error(`DELETE /api/admin/stores/${storeId} (soft delete) error:`, e);
        return NextResponse.json({ error: e.message || "Failed to soft delete store" }, { status: 500 });
    }
} 