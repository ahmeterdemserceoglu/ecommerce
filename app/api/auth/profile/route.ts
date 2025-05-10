import { NextResponse, NextRequest } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import * as z from "zod"

// Create a Supabase client with admin privileges to bypass RLS
const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseServiceKey) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY is not defined. Using regular client.")
    return null
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Zod schema for profile update by the user themselves
const userProfileUpdateSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters.").optional(),
  avatar_url: z.string().url("Invalid avatar URL.").optional().nullable(),
  phone: z.string().optional().nullable(), // Add phone validation if specific format needed
  // Users should not be able to update their email or role directly here.
  // Email change would require a verification process.
  // Role is managed by admin.
})

// Zod schema for profile creation data
const profileCreateSchema = z.object({
  userId: z.string().uuid("Invalid User ID."),
  email: z.string().email("Invalid Email."),
  fullName: z.string().min(1, "Full name is required."),
  // You might pass an initial role or determine it here
});

// GET /api/auth/profile - Get the currently authenticated user's profile
export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    console.error("Error getting session:", sessionError)
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 })
  }

  if (!session) {
    return NextResponse.json({ error: "Unauthorized: No active session" }, { status: 401 })
  }

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, email, role, full_name, avatar_url, phone, created_at, updated_at, store_id") // Select specific fields
      .eq("id", session.user.id)
      .single()

    if (error) {
      if (error.code === "PGRST116") { // Resource not found
        return NextResponse.json({ error: "Profile not found for the authenticated user." }, { status: 404 })
      }
      console.error("Error fetching profile:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!profile) { // Should be caught by PGRST116, but as a safeguard
      return NextResponse.json({ error: "Profile not found." }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch (e: any) {
    console.error("GET /api/auth/profile error:", e)
    return NextResponse.json({ error: e.message || "Failed to fetch profile" }, { status: 500 })
  }
}

// PUT /api/auth/profile - Update the currently authenticated user's profile
export async function PUT(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    console.error("Error getting session:", sessionError)
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 })
  }

  if (!session) {
    return NextResponse.json({ error: "Unauthorized: No active session" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validation = userProfileUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid profile data", details: validation.error.format() }, { status: 400 })
    }

    const profileDataToUpdate = validation.data

    if (Object.keys(profileDataToUpdate).length === 0) {
      return NextResponse.json({ message: "No fields provided for update." }, { status: 200 })
    }

    // Ensure `updated_at` is set
    const updatePayload: any = { ...profileDataToUpdate, updated_at: new Date().toISOString() }

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", session.user.id)
      .select("id, email, role, full_name, avatar_url, phone, created_at, updated_at, store_id")
      .single()

    if (updateError) {
      console.error("Error updating profile:", updateError)
      // Handle specific errors e.g., unique constraint if you allow username updates
      return NextResponse.json({ error: updateError.message || "Failed to update profile" }, { status: 500 })
    }

    if (!updatedProfile) {
      return NextResponse.json({ error: "Failed to update profile, user not found after update." }, { status: 404 })
    }

    return NextResponse.json(updatedProfile)
  } catch (e: any) {
    console.error("PUT /api/auth/profile error:", e)
    return NextResponse.json({ error: e.message || "Failed to update profile" }, { status: 500 })
  }
}

// DELETE /api/auth/profile - (Self-delete account - Be CAREFUL with this)
// Generally, this should be a more involved process, perhaps requiring password confirmation.
// For now, let's assume it's a simple self-delete, only if enabled and RLS allows.
export async function DELETE(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    console.error("Error getting session:", sessionError)
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 })
  }

  if (!session) {
    return NextResponse.json({ error: "Unauthorized: No active session" }, { status: 401 })
  }

  // IMPORTANT: Supabase RLS must be configured to allow users to delete their own 'profiles' row.
  // Also, cascade deletes for related data (auth.users row, stores, products etc.) must be handled carefully,
  // either by Supabase schema or by explicitly deleting them here (which can be complex).
  // Deleting from `auth.users` requires admin privileges.
  // This endpoint might only delete the `profiles` row and leave the `auth.users` row (orphaned).
  // A better approach is a Supabase Edge Function with admin rights for complete user deletion.

  try {
    const { error: deleteProfileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", session.user.id)

    if (deleteProfileError) {
      console.error("Error deleting user profile:", deleteProfileError)
      return NextResponse.json({ error: deleteProfileError.message || "Failed to delete profile." }, { status: 500 })
    }

    // Attempt to sign out the user after profile deletion
    await supabase.auth.signOut()

    return NextResponse.json({ message: "Profile deleted successfully. User signed out." })
  } catch (e: any) {
    console.error("DELETE /api/auth/profile error:", e)
    return NextResponse.json({ error: e.message || "Failed to delete profile" }, { status: 500 })
  }
}

// POST /api/auth/profile - Create a new user profile (typically called after signup)
export async function POST(request: NextRequest) {
  // Use Admin Client to bypass RLS for initial profile creation
  const supabaseAdmin = createAdminClient();

  if (!supabaseAdmin) {
    console.error("POST /api/auth/profile: Admin client is not configured (SUPABASE_SERVICE_ROLE_KEY missing?).");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const validation = profileCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid profile creation data", details: validation.error.format() }, { status: 400 });
    }

    const { userId, email, fullName } = validation.data;

    // Determine initial role - default to 'user'
    // You could add logic here if, e.g., specific email domains get different roles
    const initialRole = 'user';

    const profileToInsert = {
      id: userId, // Link to the auth.users table
      email: email,
      full_name: fullName,
      role: initialRole,
      // Set other defaults if necessary
      updated_at: new Date().toISOString(), // Good practice to set this
      // created_at will be set by default by the database if configured
    };

    const { data: newProfile, error: insertError } = await supabaseAdmin
      .from("profiles")
      .insert(profileToInsert)
      .select() // Select the newly created profile
      .single(); // Expect only one row

    if (insertError) {
      console.error("Error creating profile using admin client:", insertError);
      // Handle specific errors, e.g., duplicate ID (shouldn't happen if auth.signUp succeeded)
      // or duplicate email if you have a unique constraint on profiles.email
      if (insertError.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: "Profile creation failed: Duplicate email or ID.", details: insertError.detail }, { status: 409 });
      }
      return NextResponse.json({ error: insertError.message || "Failed to create profile." }, { status: 500 });
    }

    if (!newProfile) {
      return NextResponse.json({ error: "Failed to create profile, no data returned after insert." }, { status: 500 });
    }

    // Important: The trigger 'on_profile_insert_sync_role' should fire AFTER this insert
    // and update the auth.users.raw_app_meta_data with the 'role'.

    console.log(`[API /api/auth/profile POST] Profile created successfully for user ${userId}`);
    return NextResponse.json({ profile: newProfile }, { status: 201 }); // Return 201 Created status

  } catch (e: any) {
    console.error("POST /api/auth/profile error:", e);
    return NextResponse.json({ error: e.message || "Failed to process profile creation request" }, { status: 500 });
  }
}
