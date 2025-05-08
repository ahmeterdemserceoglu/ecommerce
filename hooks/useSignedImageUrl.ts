import { useEffect, useState } from "react"
import { getSignedImageUrl } from "@/lib/get-signed-url"

export function useSignedImageUrl(imageUrl?: string) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!imageUrl) {
      setSignedUrl(null)
      return
    }
    const path = imageUrl.split("/object/public/images/")[1] || imageUrl.split("/images/")[1] || imageUrl
    getSignedImageUrl("products/" + path.split("products/")[1]).then(setSignedUrl)
  }, [imageUrl])

  return signedUrl
} 