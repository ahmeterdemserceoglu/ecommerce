import { NextResponse, NextRequest } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import * as z from "zod";
// import { createAdminClient } from "@/lib/supabase/admin"; // For auth user updates/deletes

// Zod schema for admin updating a user profile
const adminUserUpdateSchema = z.object({
    email: z.string().email("Invalid email address.").optional(), // Updating email might require admin client
    role: z.enum(["user", "seller", "admin"]).optional(),
    full_name: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    is_active: z.boolean().optional(), // Example: Admin can deactivate a user account via profile flag
    store_id: z.string().uuid().optional().nullable(), // Link/unlink store if role changes to/from seller
    // Add other updatable profile fields as needed
});

// GET /api/admin/users/[userId] - Get a specific user by ID (Admin only)
export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { userId } = params;

    // Admin authorization check
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        console.error("[API /api/admin/users/[id] GET] Error getting session:", sessionError.message);
        return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 });
    }
    if (!session) {
        console.log("[API /api/admin/users/[id] GET] No session found.");
        return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 });
    }
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id) // Check the session user's role, not the target userId's role
        .single();
    if (profileError) {
        console.error(`[API /api/admin/users/[id] GET] Error fetching current admin profile for user ${session.user.id}:`, profileError.message);
        return NextResponse.json({ error: "Failed to fetch current admin profile for authorization." }, { status: 500 });
    }
    if (!profile || profile.role !== 'admin') {
        console.warn(`[API /api/admin/users/[id] GET] Authorization failed. Current user role: ${profile?.role} (Expected 'admin')`);
        return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 });
    }
    console.log(`[API /api/admin/users/[id] GET] Admin user ${session.user.id} authorized to access user ${userId}.`);
    // End admin authorization check

    try {
        const { data: userProfile, error } = await supabase
            .from("profiles")
            .select("*, store:stores!store_user_id_fkey(id, name)") // Fetch related store if any
            .eq("id", userId)
            .single();

        if (error) {
            if (error.code === "PGRST116") { // Not found
                return NextResponse.json({ error: "User not found." }, { status: 404 });
            }
            console.error(`Error fetching user ${userId} (admin):`, error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(userProfile);
    } catch (e: any) {
        console.error(`GET /api/admin/users/${userId} error:`, e);
        return NextResponse.json({ error: e.message || "Failed to fetch user" }, { status: 500 });
    }
}

// PUT /api/admin/users/[userId] - Update a specific user by ID (Admin only)
export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    // const adminAuth = createAdminClient()?.auth; // For updating auth.users properties like email
    const { userId } = params;

    // Admin authorization check
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        console.error("[API /api/admin/users/[id] PUT] Error getting session:", sessionError.message);
        return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 });
    }
    if (!session) {
        console.log("[API /api/admin/users/[id] PUT] No session found.");
        return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 });
    }
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id) // Check the session user's role
        .single();
    if (profileError) {
        console.error(`[API /api/admin/users/[id] PUT] Error fetching current admin profile for user ${session.user.id}:`, profileError.message);
        return NextResponse.json({ error: "Failed to fetch current admin profile for authorization." }, { status: 500 });
    }
    if (!profile || profile.role !== 'admin') {
        console.warn(`[API /api/admin/users/[id] PUT] Authorization failed. Current user role: ${profile?.role} (Expected 'admin')`);
        return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 });
    }
    console.log(`[API /api/admin/users/[id] PUT] Admin user ${session.user.id} authorized to update user ${userId}.`);
    // End admin authorization check

    // if (!adminAuth) {
    //     return NextResponse.json({ error: "Admin client not configured for user updates." }, { status: 500 });
    // }

    try {
        const body = await request.json();
        const validation = adminUserUpdateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: "Invalid user data for update", details: validation.error.format() }, { status: 400 });
        }

        const profileDataToUpdate = validation.data;

        if (Object.keys(profileDataToUpdate).length === 0) {
            return NextResponse.json({ message: "No fields provided for update." }, { status: 200 });
        }

        // Handle potential email update in auth.users (Requires Admin Client)
        if (profileDataToUpdate.email) {
            console.warn("Updating user email requires Supabase Admin Client (service role) to modify auth.users. Skipping auth update.");
            // const { error: emailUpdateError } = await adminAuth.updateUserById(userId, { email: profileDataToUpdate.email });
            // if (emailUpdateError) { ... handle error ... }
            // Remove email from profile update if auth update fails or isn't implemented
            // delete profileDataToUpdate.email;
        }

        // Add updated_at timestamp
        profileDataToUpdate.updated_at = new Date().toISOString();

        // Update the profile table
        const { data: updatedProfile, error: profileUpdateError } = await supabase
            .from("profiles")
            .update(profileDataToUpdate)
            .eq("id", userId)
            .select("*, store:stores!store_user_id_fkey(id, name)")
            .single();

        if (profileUpdateError) {
            console.error(`Error updating profile ${userId} (admin):`, profileUpdateError);
            return NextResponse.json({ error: profileUpdateError.message || "Failed to update user profile." }, { status: 500 });
        }

        if (!updatedProfile) {
            return NextResponse.json({ error: "User not found after update." }, { status: 404 });
        }

        return NextResponse.json(updatedProfile);

    } catch (e: any) {
        console.error(`PUT /api/admin/users/${userId} error:`, e);
        return NextResponse.json({ error: e.message || "Failed to update user" }, { status: 500 });
    }
}

// DELETE /api/admin/users/[userId] - Delete a specific user by ID (Admin only)
export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { userId } = params;

    // Admin authorization check
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        console.error("[API /api/admin/users/[id] DELETE] Error getting session:", sessionError.message);
        return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 });
    }
    if (!session) {
        console.log("[API /api/admin/users/[id] DELETE] No session found.");
        return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 });
    }
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id) // Check the session user's role
        .single();
    if (profileError) {
        console.error(`[API /api/admin/users/[id] DELETE] Error fetching current admin profile for user ${session.user.id}:`, profileError.message);
        return NextResponse.json({ error: "Failed to fetch current admin profile for authorization." }, { status: 500 });
    }
    if (!profile || profile.role !== 'admin') {
        console.warn(`[API /api/admin/users/[id] DELETE] Authorization failed. Current user role: ${profile?.role} (Expected 'admin')`);
        return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 });
    }
    console.log(`[API /api/admin/users/[id] DELETE] Admin user ${session.user.id} authorized to delete user ${userId}.`);
    // End admin authorization check

    // Prevent admin from deleting themselves
    if (session.user.id === userId) {
        return NextResponse.json({ error: "Admins cannot delete their own account." }, { status: 400 });
    }

    // if (!adminAuth) {
    //     return NextResponse.json({ error: "Admin client not configured for user deletion." }, { status: 500 });
    // }

    try {
        // IMPORTANT: Proper user deletion requires deleting from both `profiles` and `auth.users`.
        // Deleting from `auth.users` requires the Supabase Admin Client (service role).
        // Also consider cascade deletes or manual deletion of related data (stores, products, orders etc.)

        // 1. Delete from profiles table (assuming RLS allows admin or using admin client)
        const { error: profileDeleteError } = await supabase
            .from("profiles")
            .delete()
            .eq("id", userId);

        if (profileDeleteError) {
            // If user not found in profiles, maybe they only exist in auth.users?
            if (profileDeleteError.code !== 'PGRST116') { // Don't error if profile just didn't exist
                console.error(`Error deleting profile ${userId} (admin):`, profileDeleteError);
                return NextResponse.json({ error: profileDeleteError.message || "Failed to delete user profile." }, { status: 500 });
            }
        }

        // 2. Delete from auth.users (Requires Admin Client)
        console.warn("Deleting user from auth.users requires Supabase Admin Client (service role). Skipping actual auth user deletion.");
        // const { error: authDeleteError } = await adminAuth.deleteUser(userId);
        // if (authDeleteError) {
        //     // Log error but might continue if profile was deleted. Ideally use a transaction.
        //     console.error(`Error deleting auth user ${userId} (admin):`, authDeleteError);
        //     // return NextResponse.json({ error: authDeleteError.message || "Failed to delete authentication user." }, { status: 500 });
        // }

        return NextResponse.json({ message: `User ${userId} profile deleted (auth user deletion requires admin client).` });

    } catch (e: any) {
        console.error(`DELETE /api/admin/users/${userId} error:`, e);
        return NextResponse.json({ error: e.message || "Failed to delete user" }, { status: 500 });
    }
}