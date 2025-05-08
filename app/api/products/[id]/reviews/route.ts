import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Değerlendirmeleri getir
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { data: reviews, error } = await supabase
      .from("product_reviews")
      .select(`
        *,
        user:user_id (
          full_name,
          avatar_url
        ),
        responses:review_responses (
          id,
          user_id,
          response,
          created_at,
          user:user_id (
            full_name,
            avatar_url
          )
        )
      `)
      .eq("product_id", params.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(reviews)
  } catch (error: any) {
    console.error("Error fetching reviews:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Yeni değerlendirme ekle
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { rating, title, comment } = await request.json()

    if (!rating || !title || !comment) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data: review, error } = await supabase
      .from("product_reviews")
      .insert({
        product_id: params.id,
        user_id: session.user.id,
        rating,
        title,
        comment,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(review)
  } catch (error: any) {
    console.error("Error creating review:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Değerlendirmeyi güncelle
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { reviewId, rating, title, comment } = await request.json()

    if (!reviewId || !rating || !title || !comment) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data: review, error } = await supabase
      .from("product_reviews")
      .update({
        rating,
        title,
        comment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId)
      .eq("user_id", session.user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(review)
  } catch (error: any) {
    console.error("Error updating review:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Değerlendirmeyi sil
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { reviewId } = await request.json()

    if (!reviewId) {
      return NextResponse.json({ error: "Missing review ID" }, { status: 400 })
    }

    const { error } = await supabase.from("product_reviews").delete().eq("id", reviewId).eq("user_id", session.user.id)

    if (error) throw error

    return NextResponse.json({ message: "Review deleted successfully" })
  } catch (error: any) {
    console.error("Error deleting review:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
