"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { useAuth } from "@/hooks/useAuth"
import { Star, StarHalf, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Review {
  id: string
  user_id: string
  rating: number
  title: string
  comment: string
  is_verified: boolean
  created_at: string
  user: {
    full_name: string
    avatar_url: string
  }
  responses: ReviewResponse[]
}

interface ReviewResponse {
  id: string
  user_id: string
  response: string
  created_at: string
  user: {
    full_name: string
    avatar_url: string
  }
}

interface ProductReviewsProps {
  productId: string
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [newReview, setNewReview] = useState({
    rating: 0,
    title: "",
    comment: "",
  })
  const [hoveredRating, setHoveredRating] = useState(0)
  const [selectedReview, setSelectedReview] = useState<string | null>(null)
  const [responseText, setResponseText] = useState("")

  useEffect(() => {
    fetchReviews()
  }, [productId])

  const fetchReviews = async () => {
    try {
      const { data: reviewsData, error: reviewsError } = await supabase
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
        .eq("product_id", productId)
        .order("created_at", { ascending: false })

      if (reviewsError) throw reviewsError

      setReviews(reviewsData || [])
    } catch (error) {
      console.error("Error fetching reviews:", error)
      toast.error("Değerlendirmeler yüklenirken bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!user) {
      toast.error("Değerlendirme yapmak için giriş yapmalısınız")
      return
    }

    if (newReview.rating === 0) {
      toast.error("Lütfen bir puan verin")
      return
    }

    if (!newReview.title.trim()) {
      toast.error("Lütfen bir başlık girin")
      return
    }

    if (!newReview.comment.trim()) {
      toast.error("Lütfen bir yorum girin")
      return
    }

    try {
      const { error } = await supabase.from("product_reviews").insert({
        product_id: productId,
        user_id: user.id,
        rating: newReview.rating,
        title: newReview.title,
        comment: newReview.comment,
      })

      if (error) throw error

      toast.success("Değerlendirmeniz başarıyla eklendi")
      setShowReviewForm(false)
      setNewReview({ rating: 0, title: "", comment: "" })
      fetchReviews()
    } catch (error) {
      console.error("Error submitting review:", error)
      toast.error("Değerlendirme eklenirken bir hata oluştu")
    }
  }

  const handleSubmitResponse = async (reviewId: string) => {
    if (!user) {
      toast.error("Yanıt vermek için giriş yapmalısınız")
      return
    }

    if (!responseText.trim()) {
      toast.error("Lütfen bir yanıt girin")
      return
    }

    try {
      const { error } = await supabase.from("review_responses").insert({
        review_id: reviewId,
        user_id: user.id,
        response: responseText,
      })

      if (error) throw error

      toast.success("Yanıtınız başarıyla eklendi")
      setSelectedReview(null)
      setResponseText("")
      fetchReviews()
    } catch (error) {
      console.error("Error submitting response:", error)
      toast.error("Yanıt eklenirken bir hata oluştu")
    }
  }

  const renderStars = (rating: number, interactive = false) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isHovered = interactive && hoveredRating >= star
          const isSelected = interactive ? hoveredRating >= star : rating >= star
          const isHalf = !interactive && rating >= star - 0.5 && rating < star

          return (
            <button
              key={star}
              type={interactive ? "button" : undefined}
              className={`text-2xl ${isSelected ? "text-yellow-400" : "text-gray-300"}`}
              onMouseEnter={() => interactive && setHoveredRating(star)}
              onMouseLeave={() => interactive && setHoveredRating(0)}
              onClick={() => interactive && setNewReview({ ...newReview, rating: star })}
            >
              {isHalf ? <StarHalf className="w-6 h-6" /> : <Star className="w-6 h-6" />}
            </button>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return <div>Yükleniyor...</div>
  }

  return (
    <div className="space-y-8">
      {/* Değerlendirme İstatistikleri */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Ürün Değerlendirmeleri</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl font-bold">
                {(reviews.reduce((acc, review) => acc + review.rating, 0) / (reviews.length || 1)).toFixed(1)}
              </div>
              <div>
                {renderStars(
                  Math.round(reviews.reduce((acc, review) => acc + review.rating, 0) / (reviews.length || 1)),
                )}
                <div className="text-sm text-gray-500 mt-1">{reviews.length} değerlendirme</div>
              </div>
            </div>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = reviews.filter((r) => r.rating === rating).length
                const percentage = (count / (reviews.length || 1)) * 100

                return (
                  <div key={rating} className="flex items-center gap-2">
                    <div className="w-12 text-sm">{rating} yıldız</div>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full">
                      <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="w-12 text-sm text-right">{count}</div>
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <Button onClick={() => setShowReviewForm(!showReviewForm)} className="w-full">
              Değerlendirme Yap
            </Button>
          </div>
        </div>
      </div>

      {/* Değerlendirme Formu */}
      {showReviewForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Değerlendirme Yap</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Puanınız</label>
              {renderStars(newReview.rating, true)}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Başlık</label>
              <Input
                value={newReview.title}
                onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                placeholder="Değerlendirmenize bir başlık girin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Yorumunuz</label>
              <Textarea
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                placeholder="Ürün hakkında düşüncelerinizi paylaşın"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReviewForm(false)}>
                İptal
              </Button>
              <Button onClick={handleSubmitReview}>Değerlendirmeyi Gönder</Button>
            </div>
          </div>
        </div>
      )}

      {/* Değerlendirme Listesi */}
      <div className="space-y-6">
        {reviews.map((review) => (
          <div key={review.id} className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  {review.user.avatar_url ? (
                    <img
                      src={review.user.avatar_url}
                      alt={review.user.full_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold">{review.user.full_name[0]}</span>
                  )}
                </div>
                <div>
                  <div className="font-medium">{review.user.full_name}</div>
                  <div className="text-sm text-gray-500">{new Date(review.created_at).toLocaleDateString("tr-TR")}</div>
                </div>
              </div>
              {renderStars(review.rating)}
            </div>
            <h4 className="font-semibold mb-2">{review.title}</h4>
            <p className="text-gray-600 mb-4">{review.comment}</p>
            {review.is_verified && <div className="text-sm text-green-600 mb-4">✓ Doğrulanmış Alışveriş</div>}

            {/* Yanıtlar */}
            {review.responses && review.responses.length > 0 && (
              <div className="ml-8 mt-4 space-y-4">
                {review.responses.map((response) => (
                  <div key={response.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        {response.user.avatar_url ? (
                          <img
                            src={response.user.avatar_url}
                            alt={response.user.full_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold">{response.user.full_name[0]}</span>
                        )}
                      </div>
                      <div className="font-medium">{response.user.full_name}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(response.created_at).toLocaleDateString("tr-TR")}
                      </div>
                    </div>
                    <p className="text-gray-600">{response.response}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Yanıt Formu */}
            {selectedReview === review.id ? (
              <div className="mt-4">
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Yanıtınızı yazın..."
                  rows={2}
                  className="mb-2"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedReview(null)
                      setResponseText("")
                    }}
                  >
                    İptal
                  </Button>
                  <Button onClick={() => handleSubmitResponse(review.id)}>Yanıtla</Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setSelectedReview(review.id)} className="mt-2">
                <MessageSquare className="w-4 h-4 mr-2" />
                Yanıtla
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
