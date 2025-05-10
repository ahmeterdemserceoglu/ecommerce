import { NextResponse, NextRequest } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js"; // Added for service role client

// IMPORTANT: Running raw SQL like this requires careful testing and potentially breaking changes.
// It's often better to use Supabase Migrations for schema changes.
// This endpoint assumes the user running it has sufficient privileges (likely admin via RLS bypass or direct DB access if needed).

async function runSql(supabaseServiceRoleClient: any, sql: string, description: string) {
    console.log(`Executing SQL: ${description}`);
    const { error } = await supabaseServiceRoleClient.rpc('execute_sql', { sql_query: sql });
    if (error) {
        console.error(`Error executing SQL (${description}):`, error);
        throw new Error(`Failed (${description}): ${error.message}`);
    }
    console.log(`Success: ${description}`);
}

export async function POST(request: NextRequest) {
    const cookieStore = cookies();
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore }); // For auth

    // Standardized Admin authorization check
    const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession();
    if (sessionError) {
        console.error("[API /api/admin/update-database-schema POST] Error getting session:", sessionError.message);
        return NextResponse.json({ error: "Session error: " + sessionError.message }, { status: 500 });
    }
    if (!session) {
        console.log("[API /api/admin/update-database-schema POST] No session found.");
        return NextResponse.json({ error: "Unauthorized: No active session." }, { status: 401 });
    }
    const { data: userProfile, error: profileError } = await supabaseAuth
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
    if (profileError) {
        console.error(`[API /api/admin/update-database-schema POST] Error fetching profile for user ${session.user.id}:`, profileError.message);
        return NextResponse.json({ error: "Failed to fetch user profile for authorization." }, { status: 500 });
    }
    if (!userProfile || userProfile.role !== 'admin') {
        console.warn(`[API /api/admin/update-database-schema POST] Authorization failed. User role: ${userProfile?.role} (Expected 'admin')`);
        return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 });
    }
    console.log(`[API /api/admin/update-database-schema POST] Admin user ${session.user.id} authorized.`);
    // End standardized admin authorization check

    // Initialize Supabase client with SERVICE_ROLE_KEY for DDL operations via RPC
    const supabaseServiceRoleClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    try {
        console.log("Starting database schema update process...");

        // --- Create execute_sql RPC Function (if it doesn't exist) ---
        // This needs to be created once in Supabase SQL editor with SECURITY DEFINER
        /*
        CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER -- Allows function to run with definer's privileges
        AS $$
        BEGIN
          EXECUTE sql_query;
        END;
        $$;
        -- Grant execute permission to authenticated users (or specific roles)
        GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated;
        */

        // --- Table Creation ---
        await runSql(supabaseServiceRoleClient, `
            CREATE TABLE IF NOT EXISTS seller_applications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
                store_name TEXT NOT NULL,
                store_description TEXT,
                tax_id VARCHAR(20),
                company_name TEXT,
                contact_email TEXT,
                contact_phone TEXT,
                address TEXT,
                city TEXT,
                country TEXT,
                website_url TEXT,
                status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                admin_notes TEXT,
                submitted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
                reviewed_at TIMESTAMPTZ,
                reviewed_by UUID REFERENCES auth.users(id)
            );
            COMMENT ON TABLE seller_applications IS 'Stores applications submitted by users wanting to become sellers.';
        `, "Create seller_applications table");

        await runSql(supabaseServiceRoleClient, `
            CREATE TABLE IF NOT EXISTS seller_payout_transactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
                amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
                currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
                status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
                description TEXT,
                requested_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
                processed_at TIMESTAMPTZ,
                transaction_reference TEXT, -- Reference from payment provider or bank
                admin_notes TEXT,
                requested_by UUID REFERENCES auth.users(id) -- Usually the store owner
            );
            COMMENT ON TABLE seller_payout_transactions IS 'Records payout requests made by sellers.';
        `, "Create seller_payout_transactions table");

        // No separate seller_payouts table, transactions cover requests. Add bank details link later.
        // Add bank account details table for sellers
        await runSql(supabaseServiceRoleClient, `
            CREATE TABLE IF NOT EXISTS seller_bank_accounts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Owner at time of adding
                bank_name TEXT NOT NULL,
                account_holder_name TEXT NOT NULL,
                iban TEXT NOT NULL UNIQUE, -- IBAN should be unique
                swift_bic TEXT,
                currency VARCHAR(3) DEFAULT 'TRY',
                is_default BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
                updated_at TIMESTAMPTZ
            );
            CREATE INDEX IF NOT EXISTS idx_seller_bank_accounts_store_id ON seller_bank_accounts(store_id);
            COMMENT ON TABLE seller_bank_accounts IS 'Bank account details for seller payouts.';
        `, "Create seller_bank_accounts table");

        await runSql(supabaseServiceRoleClient, `
            ALTER TABLE seller_payout_transactions ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES seller_bank_accounts(id);
        `, "Add bank_account_id to seller_payout_transactions");


        // --- Alter Existing Tables ---
        await runSql(supabaseServiceRoleClient, `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;`, "Add store_id to product_variants");
        await runSql(supabaseServiceRoleClient, `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_carrier TEXT;`, "Add shipping_carrier to orders");
        await runSql(supabaseServiceRoleClient, `ALTER TABLE products ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;`, "Add submitted_at to products");
        await runSql(supabaseServiceRoleClient, `ALTER TABLE products ADD COLUMN IF NOT EXISTS reject_reason TEXT;`, "Add reject_reason to products");
        await runSql(supabaseServiceRoleClient, `ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;`, "Add user_id to products");
        await runSql(supabaseServiceRoleClient, `ALTER TABLE stores ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('pending', 'approved', 'rejected'));`, "Add verification_status to stores");
        await runSql(supabaseServiceRoleClient, `ALTER TABLE stores ADD COLUMN IF NOT EXISTS verification_notes TEXT;`, "Add verification_notes to stores");
        await runSql(supabaseServiceRoleClient, `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id UUID;`, "Add reference_id to notifications");
        await runSql(supabaseServiceRoleClient, `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_store_id UUID REFERENCES stores(id) ON DELETE SET NULL;`, "Add related_store_id to notifications");
        await runSql(supabaseServiceRoleClient, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;`, "Add store_id to profiles (optional link)");
        await runSql(supabaseServiceRoleClient, `ALTER TABLE profiles ALTER COLUMN phone TYPE TEXT;`, "Change profiles.phone type to TEXT"); // Allow various phone formats

        // --- Functions & Triggers ---
        // Update product rating function
        await runSql(supabaseServiceRoleClient, `
            CREATE OR REPLACE FUNCTION update_product_rating()
            RETURNS TRIGGER AS $$
            BEGIN
            UPDATE products
            SET 
                rating = (SELECT AVG(rating) FROM product_reviews WHERE product_id = NEW.product_id AND rating > 0),
                review_count = (SELECT COUNT(*) FROM product_reviews WHERE product_id = NEW.product_id)
            WHERE id = NEW.product_id;
            RETURN NEW;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        `, "Create/Replace update_product_rating function");

        // Trigger for product rating update
        await runSql(supabaseServiceRoleClient, `
            DROP TRIGGER IF EXISTS trigger_update_product_rating ON product_reviews;
            CREATE TRIGGER trigger_update_product_rating
            AFTER INSERT OR UPDATE OR DELETE ON product_reviews
            FOR EACH ROW EXECUTE FUNCTION update_product_rating();
        `, "Create trigger for product rating update");

        // Stock update functions (Example - consider race conditions / locking in high concurrency)
        await runSql(supabaseServiceRoleClient, `
            CREATE OR REPLACE FUNCTION decrease_stock(p_product_id UUID, p_variant_id UUID, p_quantity INT)
            RETURNS VOID AS $$
            BEGIN
                IF p_variant_id IS NOT NULL THEN
                    UPDATE product_variants
                    SET stock_quantity = stock_quantity - p_quantity
                    WHERE id = p_variant_id AND product_id = p_product_id AND stock_quantity >= p_quantity;
                    IF NOT FOUND THEN
                        RAISE EXCEPTION 'Insufficient stock for variant %', p_variant_id;
                    END IF;
                ELSE
                    UPDATE products
                    SET stock_quantity = stock_quantity - p_quantity
                    WHERE id = p_product_id AND stock_quantity >= p_quantity;
                     IF NOT FOUND THEN
                        RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
                    END IF;
                END IF;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        `, "Create decrease_stock function");

        await runSql(supabaseServiceRoleClient, `
             CREATE OR REPLACE FUNCTION increase_stock(p_product_id UUID, p_variant_id UUID, p_quantity INT)
            RETURNS VOID AS $$
            BEGIN
                IF p_variant_id IS NOT NULL THEN
                    UPDATE product_variants
                    SET stock_quantity = stock_quantity + p_quantity
                    WHERE id = p_variant_id AND product_id = p_product_id;
                ELSE
                    UPDATE products
                    SET stock_quantity = stock_quantity + p_quantity
                    WHERE id = p_product_id;
                END IF;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        `, "Create increase_stock function");

        // --- Helper Functions for RLS ---
        await runSql(supabaseServiceRoleClient, `
            CREATE OR REPLACE FUNCTION public.is_admin (check_user_id uuid)
            RETURNS boolean
            LANGUAGE sql
            SECURITY DEFINER
            SET search_path = public -- Ensures 'profiles' table is found if not schema-qualified
            AS $$
              SELECT EXISTS (
                SELECT 1
                FROM profiles -- Assuming 'profiles' is in 'public' schema
                WHERE id = check_user_id AND role = 'admin'
              );
            $$;
        `, "Create is_admin function");

        await runSql(supabaseServiceRoleClient, `
            GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
        `, "Grant execute on is_admin to authenticated role");

        // TODO: Consider adding is_store_owner function if needed for other RLS policies.
        // Example:
        // await runSql(supabaseServiceRoleClient, `
        //     CREATE OR REPLACE FUNCTION public.is_store_owner (check_user_id uuid, check_store_id uuid)
        //     RETURNS boolean
        //     LANGUAGE sql
        //     SECURITY DEFINER
        //     SET search_path = public
        //     AS $$
        //       SELECT EXISTS (
        //         SELECT 1
        //         FROM stores
        //         WHERE id = check_store_id AND user_id = check_user_id
        //       );
        //     $$;
        // `, "Create is_store_owner function");
        // await runSql(supabaseServiceRoleClient, `GRANT EXECUTE ON FUNCTION public.is_store_owner(uuid, uuid) TO authenticated;`, "Grant execute on is_store_owner");

        // Trigger for stock decrease on order creation (more complex logic needed for status changes)
        // This trigger might be too simplistic. A better approach is often calling the function explicitly after payment confirmation.
        /*
        await runSql(supabaseServiceRoleClient, `
            CREATE OR REPLACE FUNCTION handle_order_item_insert_stock()
            RETURNS TRIGGER AS $$
            BEGIN
                PERFORM decrease_stock(NEW.product_id, NEW.variant_id, NEW.quantity);
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        `, "Create handle_order_item_insert_stock function");
        
        await runSql(supabaseServiceRoleClient, `
            DROP TRIGGER IF EXISTS trigger_order_item_insert_stock ON order_items;
            CREATE TRIGGER trigger_order_item_insert_stock
            AFTER INSERT ON order_items
            FOR EACH ROW EXECUTE FUNCTION handle_order_item_insert_stock();
        `, "Create trigger for stock decrease on order item insert");
        */
        console.warn("Stock update triggers are commented out. Explicit function calls after payment are recommended.");

        // --- RLS Policies (Examples - Review and adapt based on exact needs) ---
        // Profiles
        await runSql(supabaseServiceRoleClient, `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`, "Enable RLS on profiles");
        await runSql(supabaseServiceRoleClient, `DROP POLICY IF EXISTS "Users can view their own profile." ON profiles;`, "Drop existing profiles select policy");
        await runSql(supabaseServiceRoleClient, `CREATE POLICY "Users can view profiles." ON profiles FOR SELECT USING (true);`, "Create profiles select policy (public view)"); // More restrictive might be needed
        await runSql(supabaseServiceRoleClient, `DROP POLICY IF EXISTS "Users can update their own profile." ON profiles;`, "Drop existing profiles update policy");
        await runSql(supabaseServiceRoleClient, `CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);`, "Create profiles update policy");
        await runSql(supabaseServiceRoleClient, `DROP POLICY IF EXISTS "Admins can manage all profiles." ON profiles;`, "Drop existing profiles admin policy");
        await runSql(supabaseServiceRoleClient, `CREATE POLICY "Admins can manage all profiles." ON profiles FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));`, "Create profiles admin policy");

        // Stores
        await runSql(supabaseServiceRoleClient, `ALTER TABLE stores ENABLE ROW LEVEL SECURITY;`, "Enable RLS on stores");
        await runSql(supabaseServiceRoleClient, `DROP POLICY IF EXISTS "Public can view active stores." ON stores;`, "Drop existing stores public select policy");
        await runSql(supabaseServiceRoleClient, `CREATE POLICY "Public can view active stores." ON stores FOR SELECT USING (is_active = true);`, "Create stores public select policy");
        await runSql(supabaseServiceRoleClient, `DROP POLICY IF EXISTS "Owners can manage their own stores." ON stores;`, "Drop existing stores owner policy");
        await runSql(supabaseServiceRoleClient, `CREATE POLICY "Owners can manage their own stores." ON stores FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`, "Create stores owner policy");
        await runSql(supabaseServiceRoleClient, `DROP POLICY IF EXISTS "Admins can manage all stores." ON stores;`, "Drop existing stores admin policy");
        await runSql(supabaseServiceRoleClient, `CREATE POLICY "Admins can manage all stores." ON stores FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));`, "Create stores admin policy");

        // Products (assuming policies from update-products-table route exist)
        // Add policy for seller updates (should reset approval)
        await runSql(supabaseServiceRoleClient, `DROP POLICY IF EXISTS "Sellers can update their own products." ON products;`, "Drop old product seller update policy");
        await runSql(supabaseServiceRoleClient, `CREATE POLICY "Sellers can update their own products." ON products FOR UPDATE USING (auth.uid() = (SELECT user_id FROM stores WHERE id = store_id)) WITH CHECK (auth.uid() = (SELECT user_id FROM stores WHERE id = store_id));`, "Create product seller update policy");

        // Orders
        await runSql(supabaseServiceRoleClient, `ALTER TABLE orders ENABLE ROW LEVEL SECURITY;`, "Enable RLS on orders");
        await runSql(supabaseServiceRoleClient, `DROP POLICY IF EXISTS "Users can view their own orders." ON orders;`, "Drop existing orders user select policy");
        await runSql(supabaseServiceRoleClient, `CREATE POLICY "Users can view their own orders." ON orders FOR SELECT USING (auth.uid() = user_id);`, "Create orders user select policy");
        await runSql(supabaseServiceRoleClient, `DROP POLICY IF EXISTS "Sellers can view their store orders." ON orders;`, "Drop existing orders seller select policy");
        await runSql(supabaseServiceRoleClient, `CREATE POLICY "Sellers can view their store orders." ON orders FOR SELECT USING (auth.uid() = (SELECT user_id FROM stores WHERE id = store_id));`, "Create orders seller select policy");
        await runSql(supabaseServiceRoleClient, `DROP POLICY IF EXISTS "Users can update own orders (e.g., cancel request)." ON orders;`, "Drop existing orders user update policy");
        await runSql(supabaseServiceRoleClient, `CREATE POLICY "Users can update own orders (e.g., cancel request)." ON orders FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`, "Create orders user update policy"); // Needs refinement based on allowed status changes
        await runSql(supabaseServiceRoleClient, `DROP POLICY IF EXISTS "Sellers can update their store orders." ON orders;`, "Drop existing orders seller update policy");
        await runSql(supabaseServiceRoleClient, `CREATE POLICY "Sellers can update their store orders." ON orders FOR UPDATE USING (auth.uid() = (SELECT user_id FROM stores WHERE id = store_id)) WITH CHECK (auth.uid() = (SELECT user_id FROM stores WHERE id = store_id));`, "Create orders seller update policy");
        await runSql(supabaseServiceRoleClient, `DROP POLICY IF EXISTS "Admins can manage all orders." ON orders;`, "Drop existing orders admin policy");
        await runSql(supabaseServiceRoleClient, `CREATE POLICY "Admins can manage all orders." ON orders FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));`, "Create orders admin policy");

        // Notifications
        await runSql(supabaseServiceRoleClient, `ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;`, "Enable RLS on notifications");
        await runSql(supabaseServiceRoleClient, `DROP POLICY IF EXISTS "Users can access their own notifications." ON notifications;`, "Drop existing notification policy");
        await runSql(supabaseServiceRoleClient, `CREATE POLICY "Users can access their own notifications." ON notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`, "Create notification policy");

        // Seller Applications
        await runSql(supabaseServiceRoleClient, `ALTER TABLE seller_applications ENABLE ROW LEVEL SECURITY;`, "Enable RLS on seller_applications");
        await runSql(supabaseServiceRoleClient, `CREATE POLICY "Users can manage their own application." ON seller_applications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`, "RLS for user's own seller application");
        await runSql(supabaseServiceRoleClient, `CREATE POLICY "Admins can manage all seller applications." ON seller_applications FOR ALL USING (public.is_admin(auth.uid()));`, "RLS for admin access to seller applications");

        // Seller Payout Transactions & Bank Accounts (similar policies: owner + admin)
        await runSql(supabaseServiceRoleClient, `ALTER TABLE seller_payout_transactions ENABLE ROW LEVEL SECURITY;`, "Enable RLS on seller_payout_transactions");
        await runSql(supabaseServiceRoleClient, `CREATE POLICY "Owners can manage their payout transactions." ON seller_payout_transactions FOR ALL USING (auth.uid() = requested_by OR auth.uid() = (SELECT user_id FROM stores WHERE id = store_id)) WITH CHECK (auth.uid() = requested_by OR auth.uid() = (SELECT user_id FROM stores WHERE id = store_id));`, "RLS for owner payout transactions");
        await runSql(supabaseServiceRoleClient, `CREATE POLICY "Admins can manage all payout transactions." ON seller_payout_transactions FOR ALL USING (public.is_admin(auth.uid()));`, "RLS for admin payout transactions");

        await runSql(supabaseServiceRoleClient, `ALTER TABLE seller_bank_accounts ENABLE ROW LEVEL SECURITY;`, "Enable RLS on seller_bank_accounts");
        await runSql(supabaseServiceRoleClient, `CREATE POLICY "Owners can manage their bank accounts." ON seller_bank_accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`, "RLS for owner bank accounts");
        await runSql(supabaseServiceRoleClient, `CREATE POLICY "Admins can view all bank accounts." ON seller_bank_accounts FOR SELECT USING (public.is_admin(auth.uid()));`, "RLS for admin view bank accounts"); // Admins likely shouldn't edit/delete directly


        console.log("Database schema update process completed.");
        return NextResponse.json({ success: true, message: "Database schema updated successfully." });

    } catch (e: any) {
        console.error("Database schema update failed:", e);
        return NextResponse.json({ success: false, error: e.message || "Failed to update database schema." }, { status: 500 });
    }
} 