import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import Header from "@/components/layout/header"
import { AuthProvider } from "@/hooks/use-auth"
import { CartProvider } from "@/providers/cart-provider"

export const metadata: Metadata = {
  title: "HDTicaret",
  description: "HDTicaret, Türkiye'deki en büyük online alışveriş sitesi",
  generator: "HDTicaret 2025 ",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CartProvider>
            <Header />
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
