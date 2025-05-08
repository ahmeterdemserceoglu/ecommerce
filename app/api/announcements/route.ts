import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    console.log("API: Fetching announcements")

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .lte("start_date", now)
      .or(`end_date.is.null,end_date.gt.${now}`)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("API: Error fetching announcements:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("API: Announcements fetched successfully:", data?.length || 0)
    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error("API: Announcements API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
