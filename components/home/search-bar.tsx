"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Command, CommandItem, CommandList } from "@/components/ui/command"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/database.types"

interface SearchResult {
  id: string
  name: string
  type: "product" | "category" | "store"
  image_url?: string
}

export function SearchBar() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const searchProducts = async () => {
      if (query.length < 2) {
        setResults([])
        return
      }

      const { data: products } = await supabase
        .from("products")
        .select("id, name, image_url")
        .ilike("name", `%${query}%`)
        .limit(5)

      const { data: categories } = await supabase
        .from("categories")
        .select("id, name")
        .ilike("name", `%${query}%`)
        .limit(3)

      const { data: stores } = await supabase.from("stores").select("id, name").ilike("name", `%${query}%`).limit(3)

      setResults([
        ...(products?.map((p) => ({ ...p, type: "product" as const })) || []),
        ...(categories?.map((c) => ({ ...c, type: "category" as const })) || []),
        ...(stores?.map((s) => ({ ...s, type: "store" as const })) || []),
      ])
    }

    const debounce = setTimeout(searchProducts, 300)
    return () => clearTimeout(debounce)
  }, [query, supabase])

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false)
    setQuery("")

    switch (result.type) {
      case "product":
        router.push(`/urun/${result.id}`)
        break
      case "category":
        router.push(`/kategori/${result.id}`)
        break
      case "store":
        router.push(`/magaza/${result.id}`)
        break
    }
  }

  return (
    <div className="relative w-full max-w-2xl" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Ürün, kategori veya mağaza ara..."
          className="pl-10"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border">
          <Command>
            <CommandList>
              {results.map((result) => (
                <CommandItem
                  key={`${result.type}-${result.id}`}
                  onSelect={() => handleSelect(result)}
                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent"
                >
                  {result.image_url && (
                    <img src={result.image_url} alt={result.name} className="w-8 h-8 object-cover rounded" />
                  )}
                  <div>
                    <p className="font-medium">{result.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.type === "product" && "Ürün"}
                      {result.type === "category" && "Kategori"}
                      {result.type === "store" && "Mağaza"}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  )
}
