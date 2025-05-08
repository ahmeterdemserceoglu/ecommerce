import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    console.log("API: Fetching categories")

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug")
      .is("parent_id", null)
      .order("sort_order", { ascending: true })
      .limit(8)

    if (error) {
      console.error("API: Error fetching categories:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("API: Categories fetched successfully:", data?.length || 0)
    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error("API: Categories API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
