"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Rating } from "@/components/ui/rating"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface Review {
  id: string
  user_id: string
  product_id: string
  rating: number
  comment: string
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
  const { toast } = useToast()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [newReview, setNewReview] = useState({
    rating: 0,
    comment: "",
  })

  useEffect(() => {
    fetchReviews()
  }, [productId])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/products/${productId}/reviews`)
      const data = await response.json()

      if (data.success) {
        setReviews(data.reviews)
      } else {
        toast({
          title: "Hata",
          description: data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Yorumlar alınırken hata:", error)
      toast({
        title: "Hata",
        description: "Yorumlar alınırken bir hata oluştu",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const submitReview = async () => {
    try {
      if (!newReview.rating) {
        toast({
          title: "Hata",
          description: "Lütfen bir puan verin",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newReview),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Başarılı",
          description: "Yorumunuz başarıyla eklendi",
        })
        setNewReview({
          rating: 0,
          comment: "",
        })
        fetchReviews()
      } else {
        toast({
          title: "Hata",
          description: data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Yorum eklenirken hata:", error)
      toast({
        title: "Hata",
        description: "Yorum eklenirken bir hata oluştu",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Yorum Yap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Puanınız</label>
              <Rating
                value={newReview.rating}
                onChange={(value: number) => setNewReview({ ...newReview, rating: value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Yorumunuz</label>
              <Textarea
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                placeholder="Ürün hakkında düşüncelerinizi yazın..."
                rows={4}
              />
            </div>
            <Button onClick={submitReview}>Yorum Yap</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Yorumlar</h2>
        {loading ? (
          <div>Yükleniyor...</div>
        ) : reviews.length === 0 ? (
          <div>Henüz yorum yapılmamış</div>
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{review.user.full_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(review.created_at), "dd.MM.yyyy")}
                      </span>
                    </div>
                    <Rating value={review.rating} readOnly />
                    <p className="mt-2">{review.comment}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
