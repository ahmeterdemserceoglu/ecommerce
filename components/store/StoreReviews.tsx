"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Star, ThumbsUp, Flag } from "lucide-react"
import { supabase } from "@/lib/database"
import { formatDistanceToNow } from "date-fns"

interface StoreReview {
  id: string
  store_id: string
  user_id: string
  rating: number
  review_text: string
  is_verified_purchase: boolean
  created_at: string
  user: {
    email: string
    user_metadata?: {
      full_name?: string
      avatar_url?: string
    }
  }
  responses?: StoreReviewResponse[]
}

interface StoreReviewResponse {
  id: string
  review_id: string
  response_text: string
  created_at: string
}

interface StoreReviewsProps {
  storeId: string
  limit?: number
}

export default function StoreReviews({ storeId, limit = 5 }: StoreReviewsProps) {
  const [reviews, setReviews] = useState<StoreReview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [averageRating, setAverageRating] = useState(0)
  const [ratingCounts, setRatingCounts] = useState<Record<number, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  })

  useEffect(() => {
    if (storeId) {
      fetchReviews()
      fetchRatingStats()
    }
  }, [storeId, page])

  const fetchReviews = async () => {
    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from("store_reviews")
        .select(`
          id, store_id, user_id, rating, review_text, is_verified_purchase, created_at,
          user:user_id (email, user_metadata),
          responses:store_review_responses (id, review_id, response_text, created_at)
        `)
        .eq("store_id", storeId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      if (error) throw error

      if (data) {
        if (page === 1) {
          setReviews(data)
        } else {
          setReviews((prev) => [...prev, ...data])
        }

        setHasMore(data.length === limit)
      }
    } catch (error) {
      console.error("Error fetching store reviews:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRatingStats = async () => {
    try {
      // Get average rating
      const { data: avgData, error: avgError } = await supabase.rpc("calculate_store_rating", { store_id: storeId })

      if (avgError) throw avgError

      if (avgData !== null) {
        setAverageRating(avgData)
      }

      // Get rating counts
      const { data: countData, error: countError } = await supabase
        .from("store_reviews")
        .select("rating")
        .eq("store_id", storeId)
        .eq("is_approved", true)

      if (countError) throw countError

      if (countData) {
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        countData.forEach((review) => {
          counts[review.rating as keyof typeof counts] += 1
        })
        setRatingCounts(counts)
      }
    } catch (error) {
      console.error("Error fetching rating stats:", error)
    }
  }

  const handleLoadMore = () => {
    setPage((prev) => prev + 1)
  }

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase()
  }

  const getUserName = (review: StoreReview) => {
    if (review.user?.user_metadata?.full_name) {
      return review.user.user_metadata.full_name
    }
    return review.user?.email.split("@")[0] || "Anonymous"
  }

  const renderRatingStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
          />
        ))}
      </div>
    )
  }

  const renderRatingBar = (rating: number, count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0

    return (
      <div className="flex items-center gap-2">
        <div className="w-12 text-sm">{rating} stars</div>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${percentage}%` }} />
        </div>
        <div className="w-10 text-sm text-right">{count}</div>
      </div>
    )
  }

  if (isLoading && reviews.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  const totalReviews = Object.values(ratingCounts).reduce((sum, count) => sum + count, 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold">{averageRating.toFixed(1)}</div>
                <div>
                  {renderRatingStars(Math.round(averageRating))}
                  <div className="text-sm text-muted-foreground mt-1">Based on {totalReviews} reviews</div>
                </div>
              </div>

              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating}>{renderRatingBar(rating, ratingCounts[rating], totalReviews)}</div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Review this store</h4>
              <p className="text-sm text-muted-foreground">
                Share your experience to help other shoppers make better decisions.
              </p>
              <Button className="mt-2">Write a Review</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No reviews yet. Be the first to review this store!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarImage src={review.user?.user_metadata?.avatar_url || ""} />
                    <AvatarFallback>{getInitials(review.user?.email || "")}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="font-medium">{getUserName(review)}</div>
                        <div className="flex items-center gap-2">
                          {renderRatingStars(review.rating)}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      {review.is_verified_purchase && (
                        <div className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                          Verified Purchase
                        </div>
                      )}
                    </div>

                    <div className="text-sm">{review.review_text}</div>

                    <div className="flex items-center gap-4 pt-2">
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Helpful
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        <Flag className="h-4 w-4 mr-1" />
                        Report
                      </Button>
                    </div>

                    {review.responses && review.responses.length > 0 && (
                      <div className="mt-4 pl-4 border-l-2 border-gray-200">
                        {review.responses.map((response) => (
                          <div key={response.id} className="bg-gray-50 p-3 rounded-md">
                            <div className="font-medium text-sm">Store Response</div>
                            <div className="text-xs text-muted-foreground mb-1">
                              {formatDistanceToNow(new Date(response.created_at), { addSuffix: true })}
                            </div>
                            <div className="text-sm">{response.response_text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button variant="outline" onClick={handleLoadMore} disabled={isLoading}>
                {isLoading ? "Loading..." : "Load More Reviews"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
