"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"

export function CleanProductsButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    success?: boolean
    message?: string
    error?: string
    deletedProducts?: any[]
  } | null>(null)

  const handleCleanProducts = async () => {
    if (!confirm("Bu işlem, hatalı ürünleri silecektir. Devam etmek istiyor musunuz?")) {
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/clean-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Ürünleri temizlerken bir hata oluştu")
      }

      setResult({
        success: true,
        message: data.message,
        deletedProducts: data.deletedProducts,
      })
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleCleanProducts} disabled={isLoading} variant="destructive">
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Hatalı Ürünleri Temizle
      </Button>

      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle>{result.success ? "İşlem Başarılı" : "Hata"}</AlertTitle>
          <AlertDescription>
            {result.message || result.error}
            {result.deletedProducts && result.deletedProducts.length > 0 && (
              <div className="mt-2">
                <p className="font-semibold">Silinen Ürünler:</p>
                <ul className="list-disc pl-5 mt-1">
                  {result.deletedProducts.map((product) => (
                    <li key={product.id}>
                      {product.name} (ID: {product.id})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
