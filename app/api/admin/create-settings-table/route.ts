import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Try using the create_settings_table function first
    try {
      const { data, error } = await supabase.rpc("create_settings_table")

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: "Settings table created successfully",
        created: data,
      })
    } catch (fnError) {
      console.log("Function create_settings_table not available, trying exec_sql:", fnError)

      // Try using exec_sql function
      try {
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS public.settings (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            site_name VARCHAR(255) NOT NULL DEFAULT 'E-Commerce Marketplace',
            site_description TEXT,
            contact_email VARCHAR(255),
            contact_phone VARCHAR(50),
            address TEXT,
            maintenance_mode BOOLEAN DEFAULT FALSE,
            allow_registrations BOOLEAN DEFAULT TRUE,
            allow_seller_applications BOOLEAN DEFAULT TRUE,
            commission_rate DECIMAL(5,2) DEFAULT 5.00,
            min_order_amount DECIMAL(10,2) DEFAULT 50.00,
            max_products_per_store INTEGER DEFAULT 1000,
            featured_store_limit INTEGER DEFAULT 10,
            featured_product_limit INTEGER DEFAULT 20,
            homepage_category_limit INTEGER DEFAULT 6,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Check if there are any rows in the settings table
          DO $$
          DECLARE
            settings_count INTEGER;
          BEGIN
            SELECT COUNT(*) INTO settings_count FROM public.settings;
            
            -- If no settings exist, insert default values
            IF settings_count = 0 THEN
              INSERT INTO public.settings (
                site_name, 
                site_description, 
                contact_email, 
                contact_phone, 
                address
              ) VALUES (
                'E-Commerce Marketplace', 
                'Türkiye''nin en büyük online alışveriş platformu', 
                'info@ecommerce.com', 
                '+90 212 123 4567', 
                'İstanbul, Türkiye'
              );
            END IF;
          END $$;
        `

        const { error } = await supabase.rpc("exec_sql", { sql: createTableSQL })

        if (error) throw error

        return NextResponse.json({
          success: true,
          message: "Settings table created successfully using exec_sql",
        })
      } catch (execError) {
        console.log("exec_sql function not available, trying direct SQL:", execError)

        // Last resort: use direct SQL
        try {
          // First check if the table exists
          const { data: tableExists } = await supabase
            .from("information_schema.tables")
            .select("table_name")
            .eq("table_schema", "public")
            .eq("table_name", "settings")
            .maybeSingle()

          if (!tableExists) {
            // Create the table using raw SQL
            const { error } = await supabase.sql(`
              CREATE TABLE IF NOT EXISTS public.settings (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                site_name VARCHAR(255) NOT NULL DEFAULT 'E-Commerce Marketplace',
                site_description TEXT,
                contact_email VARCHAR(255),
                contact_phone VARCHAR(50),
                address TEXT,
                maintenance_mode BOOLEAN DEFAULT FALSE,
                allow_registrations BOOLEAN DEFAULT TRUE,
                allow_seller_applications BOOLEAN DEFAULT TRUE,
                commission_rate DECIMAL(5,2) DEFAULT 5.00,
                min_order_amount DECIMAL(10,2) DEFAULT 50.00,
                max_products_per_store INTEGER DEFAULT 1000,
                featured_store_limit INTEGER DEFAULT 10,
                featured_product_limit INTEGER DEFAULT 20,
                homepage_category_limit INTEGER DEFAULT 6,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              )
            `)

            if (error) throw error

            // Insert default data
            const { error: insertError } = await supabase.sql(`
              INSERT INTO public.settings (
                site_name, 
                site_description, 
                contact_email, 
                contact_phone, 
                address
              ) VALUES (
                'E-Commerce Marketplace', 
                'Türkiye''nin en büyük online alışveriş platformu', 
                'info@ecommerce.com', 
                '+90 212 123 4567', 
                'İstanbul, Türkiye'
              )
            `)

            if (insertError) throw insertError
          }

          return NextResponse.json({
            success: true,
            message: "Settings table created successfully using direct SQL",
          })
        } catch (directError: any) {
          throw new Error(`All table creation methods failed: ${directError.message}`)
        }
      }
    }
  } catch (error: any) {
    console.error("Error creating settings table:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
