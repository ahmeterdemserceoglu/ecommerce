"use client"
import ErrorBoundary from "@/components/ErrorBoundary"
import type React from "react"

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}
