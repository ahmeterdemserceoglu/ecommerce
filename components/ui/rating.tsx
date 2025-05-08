"use client"

import * as React from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface RatingProps {
  value: number
  onChange?: (value: number) => void
  readOnly?: boolean
  max?: number
  className?: string
}

export function Rating({ value, onChange, readOnly = false, max = 5, className }: RatingProps) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null)

  const handleMouseEnter = (index: number) => {
    if (!readOnly) {
      setHoverValue(index)
    }
  }

  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoverValue(null)
    }
  }

  const handleClick = (index: number) => {
    if (!readOnly && onChange) {
      onChange(index)
    }
  }

  const displayValue = hoverValue ?? value

  return (
    <div className={cn("flex items-center space-x-1", className)} onMouseLeave={handleMouseLeave}>
      {Array.from({ length: max }).map((_, index) => (
        <button
          key={index}
          type="button"
          className={cn(
            "p-0.5 transition-colors",
            !readOnly && "cursor-pointer hover:scale-110",
            readOnly && "cursor-default",
          )}
          onMouseEnter={() => handleMouseEnter(index + 1)}
          onClick={() => handleClick(index + 1)}
          disabled={readOnly}
        >
          <Star className={cn("h-5 w-5", index < displayValue ? "fill-yellow-400 text-yellow-400" : "text-gray-300")} />
        </button>
      ))}
    </div>
  )
}
