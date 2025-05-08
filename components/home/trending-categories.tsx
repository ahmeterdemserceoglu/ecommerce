"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Layers, Smartphone, Headphones, Watch, Laptop, Speaker, Camera, Tv, Home, ShoppingBag } from "lucide-react"
import type { JSX } from "react"

export function TrendingCategories() {
  const [categories, setCategories] = useState<any[]>([])
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Try to fetch categories from settings first
        const { data: settingsData, error: settingsError } = await supabase
          .from("settings")
          .select("homepage_category_limit")
          .single()

        if (settingsError && settingsError.code !== "PGRST116") {
          console.warn("Error fetching settings:", settingsError.message)
        }

        const limit = settingsData?.homepage_category_limit || 6

        // Add a timeout to prevent infinite loading
        const categoryPromise = supabase
          .from("categories")
          .select("id, name, slug, icon")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .limit(limit)

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Category fetch timed out")), 5000),
        )

        const { data, error } = (await Promise.race([
          categoryPromise,
          timeoutPromise.then(() => ({ data: null, error: new Error("Timeout") })),
        ])) as any

        if (error) {
          console.error("Error fetching categories:", error.message)
          // Use fallback categories
          setCategories([
            { id: "1", name: "Elektronik", slug: "elektronik", icon: "smartphone" },
            { id: "2", name: "Giyim", slug: "giyim", icon: "shopping" },
            { id: "3", name: "Ev & Yaşam", slug: "ev-yasam", icon: "home" },
            { id: "4", name: "Kozmetik", slug: "kozmetik", icon: null },
            { id: "5", name: "Spor", slug: "spor", icon: null },
            { id: "6", name: "Kitap", slug: "kitap", icon: null },
          ])
          return
        }

        setCategories(data || [])
      } catch (error) {
        console.error("Error fetching trending categories:", error)
        // Fallback to default categories if there's an error
        setCategories([
          { id: "1", name: "Elektronik", slug: "elektronik", icon: "smartphone" },
          { id: "2", name: "Giyim", slug: "giyim", icon: "shopping" },
          { id: "3", name: "Ev & Yaşam", slug: "ev-yasam", icon: "home" },
          { id: "4", name: "Kozmetik", slug: "kozmetik", icon: null },
          { id: "5", name: "Spor", slug: "spor", icon: null },
          { id: "6", name: "Kitap", slug: "kitap", icon: null },
        ])
      }
    }

    fetchCategories()
  }, [supabase])

  // Map category names to icons
  const getCategoryIcon = (icon: string | null, name: string) => {
    const iconMap: Record<string, JSX.Element> = {
      smartphone: <Smartphone className="h-8 w-8" />,
      headphones: <Headphones className="h-8 w-8" />,
      watch: <Watch className="h-8 w-8" />,
      laptop: <Laptop className="h-8 w-8" />,
      speaker: <Speaker className="h-8 w-8" />,
      camera: <Camera className="h-8 w-8" />,
      tv: <Tv className="h-8 w-8" />,
      home: <Home className="h-8 w-8" />,
      shopping: <ShoppingBag className="h-8 w-8" />,
    }

    if (icon && iconMap[icon]) {
      return iconMap[icon]
    }

    // Default icon
    return <Layers className="h-8 w-8" />
  }

  if (categories.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {["Elektronik", "Giyim", "Ev & Yaşam", "Kozmetik", "Spor", "Kitap"].map((name, index) => (
          <Link key={index} href={`/kategori/${name.toLowerCase().replace(/\s+/g, "-")}`}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all p-6 flex flex-col items-center gap-3 h-full">
              <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-500">
                <Layers className="h-8 w-8" />
              </div>
              <span className="font-medium text-center">{name}</span>
            </div>
          </Link>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
      {categories.map((category) => (
        <Link key={category.id} href={`/kategori/${category.slug}`}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all p-6 flex flex-col items-center gap-3 h-full">
            <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-500">
              {getCategoryIcon(category.icon, category.name)}
            </div>
            <span className="font-medium text-center">{category.name}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
