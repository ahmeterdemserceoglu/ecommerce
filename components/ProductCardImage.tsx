"use client"

import { useEffect, useState } from "react"
import { getSignedImageUrl } from "@/lib/get-signed-url"

export function ProductCardImage({ product, selectedVariant, className = "" }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    let imagePath = ""
    // Varyant seçili ve varyanta özel resim varsa onu kullan
    if (selectedVariant && selectedVariant.images && selectedVariant.images.length > 0) {
      const primary = selectedVariant.images.find((img: any) => img.is_primary) || selectedVariant.images[0]
      imagePath = primary?.url
    }
    // Varyant yoksa veya varyanta özel resim yoksa ürünün ana görselini kullan
    else if (product.image_url) {
      imagePath = product.image_url
    }
    // Eğer yukarıdakiler yoksa image_url alanını kullan
    else if (product.image_url) {
      imagePath = product.image_url
    }
    if (imagePath) {
      const path = imagePath.split("/object/public/images/")[1] || imagePath.split("/images/")[1] || imagePath
      getSignedImageUrl("products/" + path.split("products/")[1]).then(setSignedUrl)
    } else {
      setSignedUrl(null)
    }
  }, [product, selectedVariant])

  return (
    <img
      src={signedUrl || "/placeholder.svg"}
      alt={product.name}
      className={className || "w-full h-full object-cover"}
      onError={(e) => {
        ;(e.target as HTMLImageElement).src = "/placeholder.svg"
      }}
    />
  )
}
