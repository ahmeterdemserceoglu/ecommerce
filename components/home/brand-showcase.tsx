"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface Brand {
  id: string
  name: string
  slug: string
  logo_url?: string | null
  product_count?: number | null
}

export function BrandShowcase({ brands = [] }: { brands?: Brand[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [maxScroll, setMaxScroll] = useState(0)

  useEffect(() => {
    if (containerRef.current) {
      setMaxScroll(containerRef.current.scrollWidth - containerRef.current.clientWidth)
    }

    const handleResize = () => {
      if (containerRef.current) {
        setMaxScroll(containerRef.current.scrollWidth - containerRef.current.clientWidth)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [brands])

  const scroll = (direction: "left" | "right") => {
    if (!containerRef.current) return

    const scrollAmount = containerRef.current.clientWidth / 2
    const newPosition =
      direction === "left"
        ? Math.max(0, scrollPosition - scrollAmount)
        : Math.min(maxScroll, scrollPosition + scrollAmount)

    containerRef.current.scrollTo({
      left: newPosition,
      behavior: "smooth",
    })

    setScrollPosition(newPosition)
  }

  const handleScroll = () => {
    if (containerRef.current) {
      setScrollPosition(containerRef.current.scrollLeft)
    }
  }

  return (
    <section className="mb-12">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Popüler Markalar</h2>
        <Link href="/markalar" className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline">
          Tüm Markalar
        </Link>
      </div>

      <div className="relative">
        {/* Navigation Buttons */}
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "absolute -left-4 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white shadow-md",
            scrollPosition <= 0 && "invisible opacity-0",
          )}
          onClick={() => scroll("left")}
          disabled={scrollPosition <= 0}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className={cn(
            "absolute -right-4 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white shadow-md",
            scrollPosition >= maxScroll && "invisible opacity-0",
          )}
          onClick={() => scroll("right")}
          disabled={scrollPosition >= maxScroll}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        {/* Brands Container */}
        <div ref={containerRef} className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide" onScroll={handleScroll}>
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/markalar/${brand.slug}`}
              className="flex min-w-[150px] flex-col items-center rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-orange-200 hover:shadow-md"
            >
              <div className="relative mb-3 h-16 w-full">
                <Image
                  src={brand.logo_url || "/placeholder.svg?height=64&width=120"}
                  alt={brand.name}
                  fill
                  className="object-contain"
                />
              </div>
              <h3 className="text-center text-sm font-medium">{brand.name}</h3>
              {brand.product_count !== undefined && brand.product_count > 0 && (
                <p className="mt-1 text-xs text-gray-500">{brand.product_count} ürün</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export default BrandShowcase
