"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Star } from "lucide-react"
import { supabase } from "@/lib/database"

interface StoreReviewFormProps {
  storeId: string
  userId: string
  onReviewSubmitted?: () => void
}

export default function StoreReviewForm({ storeId, userId, onReviewSubmitted }: StoreReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating before submitting your review.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Submit review to database
      const { error } = await supabase.from("store_reviews").insert({
        store_id: storeId,
        user_id: userId,
        rating,
        review_text: reviewText,
        is_approved: true, // Auto-approve for now
      })

      if (error) throw error

      toast({
        title: "Review submitted",
        description: "Thank you for your feedback about this store!",
      })

      // Reset form
      setRating(0)
      setReviewText("")

      // Notify parent component
      if (onReviewSubmitted) {
        onReviewSubmitted()
      }
    } catch (error: any) {
      console.error("Error submitting store review:", error)
      toast({
        title: "Error submitting review",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Rate This Store</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-2 font-medium">Your Rating</div>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= (hoverRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating > 0 ? `${rating} out of 5 stars` : "Select a rating"}
              </span>
            </div>
          </div>

          <div>
            <div className="mb-2 font-medium">Your Review</div>
            <Textarea
              placeholder="Share your experience with this store..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={5}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
