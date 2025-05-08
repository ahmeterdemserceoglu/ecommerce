"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle } from "lucide-react"

export default function FeaturedProductsPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [count, setCount] = useState(10)
  const [featuredProducts, setFeaturedProducts] = useState([])
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  const handleRandomFeatured = async () => {
    try {
      setLoading(true)
      setSuccess(false)

      // First, reset all featured products
      const { error: resetError } = await supabase.from("products").update({ is_featured: false }).neq("id", 0)

      if (resetError) throw resetError

      // Then, select random products to be featured
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(100)

      if (productsError) throw productsError

      // Randomly select products
      const shuffled = [...products].sort(() => 0.5 - Math.random())
      const selected = shuffled.slice(0, count)

      // Update selected products to be featured
      for (const product of selected) {
        const { error } = await supabase.from("products").update({ is_featured: true }).eq("id", product.id)

        if (error) throw error
      }

      // Get the featured products with details
      const { data: featured, error: featuredError } = await supabase
        .from("products")
        .select("id, name, price, image_url, slug")
        .eq("is_featured", true)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })

      if (featuredError) throw featuredError

      setFeaturedProducts(featured)
      setSuccess(true)
      toast({
        title: "Success!",
        description: `${count} products have been randomly set as featured.`,
      })
    } catch (error) {
      console.error("Error setting featured products:", error)
      toast({
        title: "Error",
        description: "Failed to set featured products. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Featured Products Management</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Randomly Assign Featured Products</CardTitle>
          <CardDescription>
            Select how many products you want to randomly set as featured. This will replace all currently featured
            products.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="count">Number of Featured Products</Label>
              <Input
                id="count"
                type="number"
                value={count}
                onChange={(e) => setCount(Number.parseInt(e.target.value))}
                min={1}
                max={50}
              />
            </div>
            <Button onClick={handleRandomFeatured} disabled={loading} className="mb-0.5">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Randomly Assign Featured"
              )}
            </Button>
          </div>
        </CardContent>
        {success && (
          <CardFooter className="bg-green-50 text-green-700 flex items-center gap-2 border-t">
            <CheckCircle className="h-5 w-5" />
            <span>Featured products have been successfully updated!</span>
          </CardFooter>
        )}
      </Card>

      {featuredProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Featured Products</CardTitle>
            <CardDescription>
              These products will be displayed in the featured section of your marketplace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Slug</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {featuredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.id}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>₺{product.price?.toFixed(2)}</TableCell>
                    <TableCell>{product.slug}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
