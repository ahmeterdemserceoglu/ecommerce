"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

export default function ZiraatRedirectPage() {
  const searchParams = useSearchParams()
  const [htmlForm, setHtmlForm] = useState<string | null>(null)

  useEffect(() => {
    // htmlForm'u query string'den veya localStorage'dan al
    const formFromQuery = searchParams.get("htmlForm")
    if (formFromQuery) {
      setHtmlForm(decodeURIComponent(formFromQuery))
    } else {
      // localStorage'dan al (örnek)
      const formFromStorage = localStorage.getItem("ziraatHtmlForm")
      if (formFromStorage) setHtmlForm(formFromStorage)
    }
  }, [searchParams])

  if (!htmlForm) {
    return <div className="container py-8 text-center">Ziraat Bankası ödeme formu bulunamadı.</div>
  }

  return (
    <div className="container py-8 text-center">
      <div dangerouslySetInnerHTML={{ __html: htmlForm }} />
      <p className="mt-4">Ziraat Bankası ödeme sayfasına yönlendiriliyorsunuz...</p>
    </div>
  )
} 