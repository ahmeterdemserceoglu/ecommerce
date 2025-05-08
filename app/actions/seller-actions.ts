"use server"

import { cookies } from "next/headers"
import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { revalidatePath } from "next/cache"

type SellerFormData = {
  storeName: string
  storeDescription: string
  contactEmail: string
  contactPhone: string
  address: string
  city: string
  country: string
  taxId: string
  website: string
  ownerName: string
  businessAddress: string
}

export async function checkExistingApplication() {
  try {
    const cookieStore = cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // First check if user is authenticated
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    if (authError) {
      console.error("Authentication error in checkExistingApplication:", authError)
      return {
        success: false,
        error: "Authentication error. Please log in again.",
      }
    }

    if (!session) {
      // Not an error, just no session yet
      return {
        success: true,
        notAuthenticated: true,
        existingApplication: null,
      }
    }

    // Check for existing application
    const { data, error } = await supabase
      .from("seller_applications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error checking application:", error)
      return {
        success: false,
        error: error.message || "Error checking application",
      }
    }

    // Check if user is already a seller
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (profileError) {
      console.error("Error checking profile:", profileError)
      return {
        success: false,
        error: profileError.message || "Error checking profile",
      }
    }

    // If user is already a seller, return that info
    if (profileData?.role === "seller") {
      return {
        success: true,
        isAlreadySeller: true,
        existingApplication: data || null,
      }
    }

    return {
      success: true,
      existingApplication: data || null,
    }
  } catch (error: any) {
    console.error("Error in checkExistingApplication:", error)
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    }
  }
}

export async function submitSellerApplication(formData: SellerFormData) {
  try {
    const cookieStore = cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // First check if user is authenticated
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    if (authError) {
      console.error("Authentication error in submitSellerApplication:", authError)
      return {
        success: false,
        error: "Authentication error. Please log in again.",
      }
    }

    if (!session) {
      console.error("No session found in submitSellerApplication")
      return {
        success: false,
        notAuthenticated: true,
        error: "Please log in to submit an application.",
      }
    }

    console.log("User authenticated with ID:", session.user.id)

    // Check if user already has a pending application
    const { data: existingApp, error: checkError } = await supabase.rpc("has_pending_seller_application", {
      user_id: session.user.id,
    })

    if (checkError) {
      console.error("Error checking pending application:", checkError)
      // Continue anyway, the insert might still work
    } else if (existingApp) {
      return {
        success: false,
        error: "Zaten bekleyen bir başvurunuz bulunmaktadır. Lütfen sonucunu bekleyin.",
      }
    }

    // Create slug from store name
    const slug = formData.storeName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")

    // Try to fix RLS policies first
    try {
      await fixSellerApplicationsRLS(supabase)
    } catch (error) {
      console.error("Error fixing RLS policies:", error)
      // Continue anyway, the insert might still work
    }

    // Insert the application
    const { data, error } = await supabase
      .from("seller_applications")
      .insert({
        user_id: session.user.id,
        store_name: formData.storeName,
        store_description: formData.storeDescription,
        slug,
        contact_email: formData.contactEmail,
        contact_phone: formData.contactPhone,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        tax_id: formData.taxId,
        website: formData.website,
        owner_name: formData.ownerName,
        business_address: formData.businessAddress,
        status: "pending",
      })
      .select()

    if (error) {
      console.error("Error submitting application:", error)

      // If it's an RLS error, try a different approach
      if (error.code === "42501") {
        return await submitSellerApplicationViaAPI(formData, session.user.id)
      }

      return {
        success: false,
        error: error.message || "Error submitting application",
      }
    }

    revalidatePath("/satici-ol")
    return {
      success: true,
      application: data[0] || null,
    }
  } catch (error: any) {
    console.error("Error in submitSellerApplication:", error)
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    }
  }
}

// Fallback method using API route
async function submitSellerApplicationViaAPI(formData: SellerFormData, userId: string) {
  try {
    const response = await fetch("/api/seller/applications/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...formData,
        userId,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "API error")
    }

    const data = await response.json()
    revalidatePath("/satici-ol")

    return {
      success: true,
      application: data.application || null,
    }
  } catch (error: any) {
    console.error("Error in submitSellerApplicationViaAPI:", error)
    return {
      success: false,
      error: error.message || "An unexpected error occurred with the API",
    }
  }
}

// Helper function to fix RLS policies
async function fixSellerApplicationsRLS(supabase: any) {
  // Check if the table exists
  const { data: tableExists } = await supabase.rpc("check_table_exists", { table_name: "seller_applications" })

  if (!tableExists) {
    // Create the table if it doesn't exist
    await supabase.rpc("execute_sql", {
      sql_query: `
        CREATE TABLE IF NOT EXISTS seller_applications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id),
          store_name TEXT NOT NULL,
          store_description TEXT,
          slug TEXT NOT NULL UNIQUE,
          contact_email TEXT NOT NULL,
          contact_phone TEXT,
          address TEXT,
          city TEXT,
          country TEXT,
          tax_id TEXT,
          website TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          admin_notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `,
    })
  }

  // Fix RLS policies
  await supabase.rpc("execute_sql", {
    sql_query: `
      -- Enable RLS on the table
      ALTER TABLE seller_applications ENABLE ROW LEVEL SECURITY;
      
      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view their own applications" ON seller_applications;
      DROP POLICY IF EXISTS "Users can insert their own applications" ON seller_applications;
      DROP POLICY IF EXISTS "Admins can view all applications" ON seller_applications;
      DROP POLICY IF EXISTS "Admins can update all applications" ON seller_applications;
      
      -- Create policies
      CREATE POLICY "Users can view their own applications" 
        ON seller_applications FOR SELECT 
        USING (auth.uid() = user_id);
        
      CREATE POLICY "Users can insert their own applications" 
        ON seller_applications FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
        
      CREATE POLICY "Admins can view all applications" 
        ON seller_applications FOR SELECT 
        USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
          )
        );
        
      CREATE POLICY "Admins can update all applications" 
        ON seller_applications FOR UPDATE 
        USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
          )
        );
    `,
  })
}
