"use client"

import type React from "react"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"

export default function LayoutWithAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4">{children}</main>
      <Footer />
    </div>
  )
}
