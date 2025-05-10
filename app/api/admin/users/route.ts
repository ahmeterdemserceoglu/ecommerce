export const dynamic = 'force-dynamic'; // Explicitly make the route dynamic

import { NextResponse, NextRequest } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import * as z from "zod";

// TODO: Consider using the admin client for user creation/management if RLS restricts inserts/updates/deletes
// on profiles or auth.users for non-admins. For now, assuming RLS allows admins.
// import { createAdminClient } from "@/lib/supabase/admin"; // Assuming you have an admin client setup

const userCreateSchema = z.object({
    email: z.string().email("Invalid email address."),
    password: z.string().min(6, "Password must be at least 6 characters long."),
    role: z.enum(["user", "seller", "admin"]).default("user"),
    full_name: z.string().optional(),
    phone: z.string().optional().nullable(),
    // Add other profile fields as needed
});

const userUpdateSchema = z.object({
    email: z.string().email().optional(),
    full_name: z.string().optional(),
    role: z.enum(['user', 'admin', 'seller']).optional(),
    // Diğer güncellenebilir alanlar
});

// GET /api/admin/users - List all users (Admin only)
export async function GET(request: NextRequest) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
        console.error("[API /api/admin/users GET] Error getting session:", sessionError.message);
        return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 });
    }

    if (!session) {
        console.log("[API /api/admin/users GET] No session found on the server.");
        return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 });
    }

    console.log(`[API /api/admin/users GET] Session User ID: ${session.user.id}. Fetching profile for role check.`);
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (profileError) {
        console.error(`[API /api/admin/users GET] Error fetching profile for user ${session.user.id}:`, profileError.message);
        return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 });
    }

    if (!profile) {
        console.warn(`[API /api/admin/users GET] Profile not found for user ${session.user.id}. Authorization denied.`);
        return NextResponse.json({ error: "Unauthorized: User profile not found." }, { status: 403 });
    }

    const userRoleFromProfile = profile.role;
    console.log(`[API /api/admin/users GET] User role from profile: ${userRoleFromProfile}`);

    if (userRoleFromProfile !== 'admin') {
        console.warn(`[API /api/admin/users GET] Authorization failed. User role: ${userRoleFromProfile} (Expected 'admin')`);
        return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 });
    }

    console.log(`[API /api/admin/users GET] Authorization successful for admin user: ${session.user.id}`);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const searchTerm = searchParams.get("searchTerm") || "";
    const roleFilter = searchParams.get("roleFilter") || "";
    const offset = (page - 1) * limit;

    let query = supabase
        .from("profiles")
        .select(
            "id, full_name, email, role, avatar_url, created_at, store_id, store:stores!store_id(id, name)",
            { count: "exact" }
        )
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

    if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }
    if (roleFilter) {
        query = query.eq("role", roleFilter);
    }

    const { data: users, error: usersError, count } = await query;

    if (usersError) {
        console.error("[API /api/admin/users GET] Error fetching users:", usersError);
        return NextResponse.json({ error: "Failed to fetch users. " + usersError.message }, { status: 500 });
    }

    return NextResponse.json({
        users,
        totalPages: Math.ceil((count || 0) / limit),
        currentPage: page,
        totalUsers: count || 0,
    });
}

// POST /api/admin/users - Create a new user (Admin only)
export async function POST(request: NextRequest) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (profileError) {
        console.error(`[API /api/admin/users POST] Error fetching profile for user ${session.user.id}:`, profileError.message);
        return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 });
    }
    if (!profile || profile.role !== 'admin') {
        console.warn(`[API /api/admin/users POST] Authorization failed. User role: ${profile?.role} (Expected 'admin')`);
        return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 });
    }

    console.log(`[API /api/admin/users POST] Admin user ${session.user.id} authorized.`);

    let parsedData;
    try {
        const rawData = await request.json();
        parsedData = userCreateSchema.parse(rawData);
    } catch (e) {
        if (e instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid input data", details: e.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Admin client ile kullanıcı oluşturma (Supabase auth.admin.createUser)
    // BU KISIM İÇİN SERVICE_ROLE_KEY GEREKLİDİR ve ayrı bir admin client oluşturulmalıdır.
    // Mevcut `createRouteHandlerClient` bunu yapamaz.
    // Örnek: const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    // const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    //     email: parsedData.email,
    //     password: parsedData.password,
    //     email_confirm: true, // Otomatik onayla
    //     user_metadata: { full_name: parsedData.full_name }
    // });
    // if (createError) { ... }
    // profiles tablosuna kayıt trigger ile otomatik olmalı (handle_new_user)

    console.warn("[API /api/admin/users POST] User creation via auth.admin.createUser is not fully implemented in this snippet.");
    return NextResponse.json({ message: "User creation endpoint hit, but admin user creation logic needs SUPABASE_SERVICE_ROLE_KEY and admin client." }, { status: 202 });
} 