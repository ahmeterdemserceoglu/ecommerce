import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      storeName,
      storeDescription,
      contactEmail,
      contactPhone,
      address,
      city,
      country,
      taxId,
      website,
      userId,
      ownerName,
      businessAddress,
    } = body

    // Validate required fields
    if (!storeName || !storeDescription || !contactEmail || !contactPhone || !address || !city || !userId) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Create slug from store name
    const slug = storeName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")

    // Initialize Supabase client
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Mağaza veya seller kaydı var mı?
    const { data: existingStore } = await supabase.from("stores").select("id").eq("user_id", userId).maybeSingle()

    if (existingStore) {
      return NextResponse.json({ success: false, error: "Bu hesaba ait zaten bir mağaza var." }, { status: 400 })
    }

    const { data: existingSeller } = await supabase.from("sellers").select("id").eq("user_id", userId).maybeSingle()

    if (existingSeller) {
      return NextResponse.json({ success: false, error: "Bu hesaba ait zaten bir satıcı kaydı var." }, { status: 400 })
    }

    // Doğrudan insert ile başvuru ekle
    const { data, error } = await supabase
      .from("seller_applications")
      .insert([
        {
          user_id: userId,
          store_name: storeName,
          store_description: storeDescription,
          slug,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          address,
          city,
          country,
          tax_id: taxId,
          website,
          status: "pending",
          owner_name: ownerName,
          business_address: businessAddress,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Başvuru eklenemedi:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, application: data })
  } catch (error: any) {
    console.error("Error in submit API route:", error)
    return NextResponse.json(
      { success: false, error: error.message || "An unexpected error occurred" },
      { status: 500 },
    )
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
