import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { id } = params;

    const { data: account, error } = await supabase
        .from("managed_bank_accounts")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !account) {
        return new Response(JSON.stringify({ error: error?.message || "Hesap bulunamadı." }), { status: 404 });
    }

    return new Response(JSON.stringify({ account }), { status: 200 });
} 