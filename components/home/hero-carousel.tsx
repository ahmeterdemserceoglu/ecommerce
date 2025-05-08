"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface Banner {
  id: string
  title: string
  subtitle?: string | null
  description?: string | null
  image_url?: string | null
  link?: string | null
  button_text?: string | null
  background_color?: string | null
  text_color?: string | null
  text_position?: string | null
  sort_order?: number | null
}

function HeroCarousel({ banners = [] }: { banners?: Banner[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const goToNext = useCallback(() => {
    if (banners.length === 0) return
    setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length)
  }, [banners.length])

  const goToPrevious = useCallback(() => {
    if (banners.length === 0) return
    setCurrentIndex((prevIndex) => (prevIndex - 1 + banners.length) % banners.length)
  }, [banners.length])

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
    // Restart autoplay after 5 seconds of inactivity
    setTimeout(() => setIsAutoPlaying(true), 5000)
  }, [])

  // Handle touch events for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 100) {
      // Swipe left
      goToNext()
    } else if (touchStart - touchEnd < -100) {
      // Swipe right
      goToPrevious()
    }
  }

  // Auto-advance slides
  useEffect(() => {
    if (!isAutoPlaying || banners.length <= 1) return

    const interval = setInterval(goToNext, 5000)
    return () => clearInterval(interval)
  }, [isAutoPlaying, goToNext, banners.length])

  if (!banners || banners.length === 0) {
    return null
  }

  const currentBanner = banners[currentIndex]
  const textPositionClass = getTextPositionClass(currentBanner.text_position)

  return (
    <div className="relative mx-auto mb-8 w-full overflow-hidden rounded-lg shadow-lg md:rounded-xl lg:rounded-2xl">
      <div
        className="relative h-[300px] w-full sm:h-[350px] md:h-[400px] lg:h-[500px]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          backgroundColor: currentBanner.background_color || "#f97316",
        }}
      >
        {/* Banner Image */}
        {currentBanner.image_url && (
          <Image
            src={currentBanner.image_url || "/placeholder.svg"}
            alt={currentBanner.title}
            fill
            priority
            className="object-cover object-center"
          />
        )}

        {/* Content Overlay */}
        <div className={cn("absolute inset-0 flex flex-col justify-center p-6 md:p-10 lg:p-16", textPositionClass)}>
          <div
            className="max-w-md space-y-3 rounded-lg bg-opacity-80 p-4 backdrop-blur-sm md:space-y-4 lg:space-y-6"
            style={{
              backgroundColor: `${currentBanner.background_color || "#f97316"}40`,
              color: currentBanner.text_color || "#ffffff",
            }}
          >
            {currentBanner.subtitle && (
              <p className="text-sm font-medium uppercase tracking-wider md:text-base">{currentBanner.subtitle}</p>
            )}
            <h2 className="text-2xl font-bold leading-tight md:text-3xl lg:text-4xl xl:text-5xl">
              {currentBanner.title}
            </h2>
            {currentBanner.description && (
              <p className="text-sm md:text-base lg:text-lg">{currentBanner.description}</p>
            )}
            {currentBanner.button_text && currentBanner.link && (
              <Button
                asChild
                size="lg"
                className="mt-2 font-medium md:mt-4"
                style={{
                  backgroundColor: currentBanner.text_color || "#ffffff",
                  color: currentBanner.background_color || "#f97316",
                }}
              >
                <Link href={currentBanner.link}>{currentBanner.button_text}</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Arrows */}
        {banners.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.preventDefault()
                goToPrevious()
              }}
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/30 text-white backdrop-blur-sm transition-all hover:bg-white/50 md:left-4 md:h-12 md:w-12"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                goToNext()
              }}
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/30 text-white backdrop-blur-sm transition-all hover:bg-white/50 md:right-4 md:h-12 md:w-12"
              aria-label="Next slide"
            >
              <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
            </button>
          </>
        )}

        {/* Indicators */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 w-8 rounded-full transition-all ${
                  index === currentIndex ? "bg-white" : "bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function getTextPositionClass(position?: string | null): string {
  switch (position?.toLowerCase()) {
    case "left":
      return "items-start text-left"
    case "right":
      return "items-end text-right"
    case "center":
    default:
      return "items-center text-center"
  }
}

// Export as both named export and default export
export { HeroCarousel }
export default HeroCarousel
