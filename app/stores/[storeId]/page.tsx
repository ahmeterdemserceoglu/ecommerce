"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserNav } from "@/components/user-nav"
import { Star, MapPin, Clock, Instagram, Twitter, Facebook, Heart, ShoppingCart } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function StorePage({ params }: { params: { storeId: string } }) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Mock store data - in a real app, this would be fetched from Supabase
  const store = {
    id: params.storeId,
    name: "Fashion Boutique",
    description: "Premium fashion items for all occasions",
    logo: "/placeholder.svg?height=100&width=100",
    banner: "/placeholder.svg?height=300&width=1200",
    rating: 4.8,
    reviewCount: 124,
    location: "Istanbul, Turkey",
    workingHours: "Mon-Fri: 9AM-6PM, Sat: 10AM-4PM",
    socialMedia: {
      instagram: "https://instagram.com/fashionboutique",
      twitter: "https://twitter.com/fashionboutique",
      facebook: "https://facebook.com/fashionboutique",
    },
    products: [
      {
        id: "1",
        name: "Summer Dress",
        price: 89.99,
        image: "/placeholder.svg?height=300&width=300",
        rating: 4.7,
        reviewCount: 42,
      },
      {
        id: "2",
        name: "Casual Jeans",
        price: 59.99,
        image: "/placeholder.svg?height=300&width=300",
        rating: 4.5,
        reviewCount: 28,
      },
      {
        id: "3",
        name: "Elegant Blouse",
        price: 45.99,
        image: "/placeholder.svg?height=300&width=300",
        rating: 4.8,
        reviewCount: 36,
      },
      {
        id: "4",
        name: "Winter Coat",
        price: 129.99,
        image: "/placeholder.svg?height=300&width=300",
        rating: 4.9,
        reviewCount: 19,
      },
    ],
  }

  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (data.session) {
        setUser(data.session.user)
      }

      setLoading(false)
    }

    checkUser()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between py-4">
          <Link href="/">
            <h1 className="text-xl font-bold">E-Commerce Marketplace</h1>
          </Link>
          {user ? (
            <UserNav user={user} />
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/auth/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Register</Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* Store Banner */}
        <div className="relative h-48 w-full md:h-64 lg:h-80">
          <Image src={store.banner || "/placeholder.svg"} alt={`${store.name} banner`} fill className="object-cover" />
        </div>

        {/* Store Info */}
        <div className="container py-6">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-md">
              <Image src={store.logo || "/placeholder.svg"} alt={store.name} fill className="object-cover" />
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold">{store.name}</h1>
              <p className="mt-1 text-muted-foreground">{store.description}</p>

              <div className="mt-2 flex items-center gap-4">
                <div className="flex items-center">
                  <Star className="mr-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{store.rating}</span>
                  <span className="ml-1 text-sm text-muted-foreground">({store.reviewCount} reviews)</span>
                </div>

                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-1 h-4 w-4" />
                  {store.location}
                </div>

                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-1 h-4 w-4" />
                  {store.workingHours}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <Heart className="mr-2 h-4 w-4" />
                Follow Store
              </Button>

              <div className="flex items-center gap-2">
                <Link href={store.socialMedia.instagram} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Instagram className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={store.socialMedia.twitter} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Twitter className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={store.socialMedia.facebook} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Facebook className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <Tabs defaultValue="products" className="mt-8">
            <TabsList>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="policies">Policies</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="mt-6">
              <h2 className="mb-4 text-2xl font-semibold">Featured Products</h2>

              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {store.products.map((product) => (
                  <Card key={product.id} className="overflow-hidden">
                    <div className="relative aspect-square">
                      <Image
                        src={product.image || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform hover:scale-105"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{product.name}</h3>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="font-medium">${product.price.toFixed(2)}</span>
                        <div className="flex items-center text-sm">
                          <Star className="mr-1 h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{product.rating}</span>
                          <span className="ml-1 text-xs text-muted-foreground">({product.reviewCount})</span>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Heart className="mr-2 h-3 w-3" />
                          Save
                        </Button>
                        <Button size="sm" className="flex-1">
                          <ShoppingCart className="mr-2 h-3 w-3" />
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reviews">
              <h2 className="mb-4 text-2xl font-semibold">Customer Reviews</h2>
              <p className="text-muted-foreground">
                This section would display customer reviews and ratings for the store.
              </p>
            </TabsContent>

            <TabsContent value="about">
              <h2 className="mb-4 text-2xl font-semibold">About the Store</h2>
              <p className="text-muted-foreground">
                This section would display detailed information about the store, its history, and mission.
              </p>
            </TabsContent>

            <TabsContent value="policies">
              <h2 className="mb-4 text-2xl font-semibold">Store Policies</h2>
              <p className="text-muted-foreground">
                This section would display the store's shipping, return, and refund policies.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
