"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

interface ProductImage {
  id: string
  url: string
  alt_text?: string
  is_primary: boolean
  order_index: number
}

interface ProductImageGalleryProps {
  images: ProductImage[]
  productName: string
}

export default function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<ProductImage | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (images && images.length > 0) {
      // Find primary image or use first image
      const primaryImage = images.find((img) => img.is_primary) || images[0]
      setSelectedImage(primaryImage)
    }

    // Simulate loading for demo purposes
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [images])

  const handleThumbnailClick = (image: ProductImage) => {
    setSelectedImage(image)
  }

  const handleNextImage = () => {
    if (!images || images.length <= 1) return

    const currentIndex = images.findIndex((img) => img.id === selectedImage?.id)
    const nextIndex = (currentIndex + 1) % images.length
    setSelectedImage(images[nextIndex])
  }

  const handlePrevImage = () => {
    if (!images || images.length <= 1) return

    const currentIndex = images.findIndex((img) => img.id === selectedImage?.id)
    const prevIndex = (currentIndex - 1 + images.length) % images.length
    setSelectedImage(images[prevIndex])
  }

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-square bg-gray-100 flex items-center justify-center rounded-lg">
        <p className="text-gray-500">No images available</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="w-full aspect-square rounded-lg" />
          <div className="flex space-x-2 mt-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="w-20 h-20 rounded-md" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative w-full aspect-square bg-gray-50 rounded-lg overflow-hidden mb-2">
            {selectedImage && (
              <>
                <Image
                  src={selectedImage.url || "/placeholder.svg"}
                  alt={selectedImage.alt_text || productName}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />

                <div className="absolute inset-0 flex items-center justify-between px-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full bg-white/80 hover:bg-white"
                    onClick={handlePrevImage}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full bg-white/80 hover:bg-white"
                    onClick={handleNextImage}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 rounded-full bg-white/80 hover:bg-white"
                      onClick={() => setIsFullscreen(true)}
                    >
                      <Maximize2 className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl w-[90vw] h-[90vh] p-0">
                    <div className="relative w-full h-full">
                      <Image
                        src={selectedImage.url || "/placeholder.svg"}
                        alt={selectedImage.alt_text || productName}
                        fill
                        className="object-contain"
                        sizes="90vw"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 rounded-full bg-white/80 hover:bg-white"
                        onClick={() => setIsFullscreen(false)}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>

          <div className="flex space-x-2 overflow-x-auto pb-2">
            {images.map((image) => (
              <button
                key={image.id}
                className={`relative w-20 h-20 rounded-md overflow-hidden border-2 ${
                  selectedImage?.id === image.id ? "border-primary" : "border-transparent"
                }`}
                onClick={() => handleThumbnailClick(image)}
              >
                <Image
                  src={image.url || "/placeholder.svg"}
                  alt={image.alt_text || `${productName} thumbnail`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
