"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import React from "react"

// This component handles redirections from ID-based URLs to slug-based URLs for stores
export default function StoreIdRedirect({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { id } = React.use(params)

  useEffect(() => {
    const redirectToSlugUrl = async () => {
      try {
        // Fetch the store by ID
        const { data: store, error } = await supabase.from("stores").select("slug").eq("id", id).single()

        if (error) {
          console.error("Error fetching store:", error)
          // If store not found, redirect to 404
          router.push("/404")
          return
        }

        if (store && store.slug) {
          // Redirect to the slug-based URL
          router.replace(`/magaza/${store.slug}`)
        } else {
          // If no slug is available, stay on this page but show a message
          console.warn("Store found but no slug available")
          // We'll handle this case in the render below
        }
      } catch (error) {
        console.error("Error in redirect:", error)
        router.push("/404")
      }
    }

    redirectToSlugUrl()
  }, [id, router, supabase])

  // Show loading state while redirecting
  return (
    <div className="container mx-auto py-12 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
      <h2 className="text-xl font-medium">Mağaza sayfasına yönlendiriliyorsunuz...</h2>
    </div>
  )
}
