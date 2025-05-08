import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Yanıtları getir
export async function GET(request: Request, { params }: { params: { id: string; reviewId: string } }) {
  try {
    const { data: responses, error } = await supabase
      .from("review_responses")
      .select(`
        *,
        user:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq("review_id", params.reviewId)
      .order("created_at", { ascending: true })

    if (error) throw error

    return NextResponse.json(responses)
  } catch (error: any) {
    console.error("Error fetching responses:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Yeni yanıt ekle
export async function POST(request: Request, { params }: { params: { id: string; reviewId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { response } = await request.json()

    if (!response) {
      return NextResponse.json({ error: "Missing response text" }, { status: 400 })
    }

    const { data: reviewResponse, error } = await supabase
      .from("review_responses")
      .insert({
        review_id: params.reviewId,
        user_id: session.user.id,
        response,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(reviewResponse)
  } catch (error: any) {
    console.error("Error creating response:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Yanıtı güncelle
export async function PUT(request: Request, { params }: { params: { id: string; reviewId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { responseId, response } = await request.json()

    if (!responseId || !response) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data: reviewResponse, error } = await supabase
      .from("review_responses")
      .update({
        response,
        updated_at: new Date().toISOString(),
      })
      .eq("id", responseId)
      .eq("user_id", session.user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(reviewResponse)
  } catch (error: any) {
    console.error("Error updating response:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Yanıtı sil
export async function DELETE(request: Request, { params }: { params: { id: string; reviewId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { responseId } = await request.json()

    if (!responseId) {
      return NextResponse.json({ error: "Missing response ID" }, { status: 400 })
    }

    const { error } = await supabase
      .from("review_responses")
      .delete()
      .eq("id", responseId)
      .eq("user_id", session.user.id)

    if (error) throw error

    return NextResponse.json({ message: "Response deleted successfully" })
  } catch (error: any) {
    console.error("Error deleting response:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
