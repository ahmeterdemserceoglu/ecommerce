"use client"

import type React from "react"

import { useState } from "react"
import { Search } from "lucide-react"

export default function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center w-full max-w-xl mx-auto bg-white rounded-full shadow px-4 py-2 border border-gray-200 focus-within:ring-2 ring-blue-500"
    >
      <Search className="w-5 h-5 text-gray-400 mr-2" />
      <input
        type="text"
        className="flex-1 outline-none bg-transparent text-base"
        placeholder="Ürün, kategori veya marka ara..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />
      <button
        type="submit"
        className="ml-2 px-4 py-1 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
      >
        Ara
      </button>
    </form>
  )
}
