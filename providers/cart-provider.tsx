"use client"

import type React from "react"
import { createContext, useEffect, useState, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

export type CartItem = {
  id: string
  productId: string
  slug: string // ürün slug
  variantId?: string
  quantity: number
  price: number
  name: string
  image: string
  storeName: string
  storeId: string
  storeSlug: string // mağaza slug
  variantName?: string
  options?: Record<string, string>
  categoryId?: string // ürün kategorisi
}

type CartContextType = {
  cartItems: CartItem[]
  cartItemsCount: number
  cartTotal: number
  addToCart: (item: Omit<CartItem, "id">) => Promise<void>
  updateQuantity: (itemId: string, quantity: number) => Promise<void>
  removeFromCart: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  loading: boolean
  error: string | null
  reloadCart: () => Promise<void>
}

export const CartContext = createContext<CartContextType>({
  cartItems: [],
  cartItemsCount: 0,
  cartTotal: 0,
  addToCart: async () => { },
  updateQuantity: async () => { },
  removeFromCart: async () => { },
  clearCart: async () => { },
  loading: true,
  error: null,
  reloadCart: async () => { },
})

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadAttempts, setLoadAttempts] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const auth = useAuth() || { user: null, loading: false }
  const user = (auth as any).user
  const authLoading = (auth as any).loading
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  // Calculate derived values
  const cartItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // Kullanıcıya ait cart'ı bul veya oluştur
  const createCartSafely = async (userId: string) => {
    if (process.env.NODE_ENV === "development" || window.location.hostname === "localhost") {
      return "local-cart"
    }

    try {
      // First check if user already has a cart
      const { data: existingCart, error: existingCartError } = await supabase
        .from("carts")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle()

      // If we found an existing cart, return its ID
      if (existingCart && existingCart.id) {
        console.log("Found existing cart:", existingCart.id)
        return existingCart.id
      }

      // If no cart was found (and no error), create a new one
      if (!existingCartError) {
        try {
          const { data: newCart, error: newCartError } = await supabase
            .from("carts")
            .insert({ user_id: userId })
            .select("id")
            .single()

          if (newCart && newCart.id) {
            console.log("Created new cart:", newCart.id)
            return newCart.id
          }

          if (newCartError) {
            // If we get a unique constraint violation, it means another request created the cart
            // in the meantime, so try to fetch it again
            if (newCartError.code === "23505") {
              console.log("Cart was created by another request, fetching it")
              const { data: retryCart, error: retryError } = await supabase
                .from("carts")
                .select("id")
                .eq("user_id", userId)
                .single()

              if (retryCart && retryCart.id) {
                return retryCart.id
              }

              throw new Error(retryError?.message || "Failed to retrieve cart after creation conflict")
            }

            throw new Error(newCartError.message)
          }
        } catch (insertError) {
          // If insert fails with a unique constraint violation, try to fetch the existing cart
          if (insertError.code === "23505") {
            const { data: conflictCart, error: conflictError } = await supabase
              .from("carts")
              .select("id")
              .eq("user_id", userId)
              .single()

            if (conflictCart && conflictCart.id) {
              return conflictCart.id
            }

            throw new Error(conflictError?.message || "Failed to retrieve cart after conflict")
          }

          throw insertError
        }
      }

      // Handle the case where there was an error checking for an existing cart
      if (existingCartError.code === "PGRST116") {
        // No cart found, create a new one
        const { data: newCart, error: newCartError } = await supabase
          .from("carts")
          .insert({ user_id: userId })
          .select("id")
          .single()

        if (newCart && newCart.id) {
          console.log("Created new cart after PGRST116:", newCart.id)
          return newCart.id
        }

        throw new Error(newCartError?.message || "Failed to create cart after PGRST116")
      }

      throw new Error(existingCartError.message)
    } catch (error) {
      console.error("Error in createCartSafely:", error)
      throw new Error(error.message || "Failed to create or retrieve cart")
    }
  }

  const slugify = (str: string) => {
    if (!str) return ""
    return String(str)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
  }

  // Sepeti yükleme fonksiyonu - useCallback ile memoize edilmiş
  const loadCart = useCallback(async () => {
    console.log("Sepet yükleniyor, kullanıcı:", user?.id, "Auth yükleniyor:", authLoading)
    if (authLoading) return

    setLoading(true)
    setError(null)

    try {
      if (user) {
        try {
          const { error: tableCheckError } = await supabase.from("carts").select("id").limit(1)
          if (tableCheckError && tableCheckError.message.includes("does not exist")) {
            console.error("Carts table does not exist. Please run the database migrations.")
            throw new Error("Carts table does not exist. Please run the database migrations.")
          }

          let cartId: string | null = null
          try {
            cartId = await createCartSafely(user.id)
            console.log("Cart created or retrieved:", cartId)
          } catch (cartError: any) {
            console.error("Could not create or retrieve cart:", cartError.message)

            // Check if this is a duplicate key error, which means the cart already exists
            if (cartError.message && cartError.message.includes("duplicate key value")) {
              // Try to fetch the existing cart one more time
              const { data: existingCart } = await supabase.from("carts").select("id").eq("user_id", user.id).single()

              if (existingCart && existingCart.id) {
                cartId = existingCart.id
                console.log("Retrieved existing cart after duplicate key error:", cartId)
              } else {
                throw new Error(`Sepet oluşturulamadı: ${cartError.message}`)
              }
            } else {
              throw new Error(`Sepet oluşturulamadı: ${cartError.message}`)
            }
          }

          if (cartId === "local-cart") {
            const storedCart = localStorage.getItem("cart")
            if (storedCart) {
              try {
                setCartItems(JSON.parse(storedCart))
                return
              } catch (e) {
                setCartItems([])
                return
              }
            } else {
              setCartItems([])
              return
            }
          }

          if (cartId) {
            const { data: cartItemsData, error: cartItemsError } = await supabase
              .from("cart_items")
              .select(`
                id,
                quantity,
                product_id,
                variant_id
              `)
              .eq("cart_id", cartId)
              .order("created_at", { ascending: false })

            if (cartItemsError) {
              throw new Error(`Sepet öğeleri alınırken hata: ${cartItemsError.message}`)
            }

            if (cartItemsData && cartItemsData.length > 0) {
              const formattedItems = await Promise.all(
                cartItemsData.map(async (item) => {
                  try {
                    const { data: product, error: productError } = await supabase
                      .from("products")
                      .select(`
                        id,
                        name,
                        slug,
                        price,
                        discount_price,
                        store_id,
                        category_id,
                        stores(id, name, slug)
                      `)
                      .eq("id", item.product_id)
                      .single()

                    if (productError) {
                      throw new Error(`Ürün bilgileri alınamadı: ${productError.message}`)
                    }

                    if (!product?.slug) {
                      console.error(`CartProvider: Ürün slug'ı eksik! Ürün ID: ${item.product_id}`, product)
                      const fallbackSlug = product?.name ? slugify(product.name) : `product-${item.product_id}`
                      product.slug = fallbackSlug
                    }

                    const { data: images, error: imageError } = await supabase
                      .from("product_images")
                      .select("url")
                      .eq("product_id", item.product_id)
                      .eq("is_primary", true)
                      .limit(1)

                    if (imageError) {
                      console.warn(`Ürün resmi alınamadı: ${imageError.message}`)
                    }

                    let variantName = undefined
                    let options = undefined
                    if (item.variant_id) {
                      const { data: variant, error: variantError } = await supabase
                        .from("product_variants")
                        .select("name, options")
                        .eq("id", item.variant_id)
                        .single()

                      if (variantError && variantError.code !== "PGRST116") {
                        console.warn(`Varyant bilgileri alınamadı: ${variantError.message}`)
                      }

                      if (variant) {
                        variantName = variant.name
                        options = variant.options
                      }
                    }

                    let storeName = "Mağaza bulunamadı"
                    let storeId = ""
                    let storeSlug = ""
                    if (product.stores && typeof product.stores === "object") {
                      if (Array.isArray(product.stores) && product.stores.length > 0) {
                        const s = product.stores[0] as { name?: string; id?: string; slug?: string }
                        storeName = s && typeof s === "object" && "name" in s ? (s.name as string) : storeName
                        storeId = s && typeof s === "object" && "id" in s ? (s.id as string) : storeId
                        storeSlug = s && typeof s === "object" && "slug" in s ? (s.slug as string) : storeSlug
                        if (!storeSlug && s.name) {
                          storeSlug = slugify(s.name)
                          console.warn(`Generated fallback slug for store: ${storeSlug}`)
                        }
                      } else if (!Array.isArray(product.stores)) {
                        const s = product.stores as { name?: string; id?: string; slug?: string }
                        storeName = "name" in s ? (s.name as string) : storeName
                        storeId = "id" in s ? (s.id as string) : storeId
                        storeSlug = "slug" in s ? (s.slug as string) : storeSlug
                        if (!storeSlug && s.name) {
                          storeSlug = slugify(s.name)
                          console.warn(`Generated fallback slug for store: ${storeSlug}`)
                        }
                      }
                    }

                    return {
                      id: item.id,
                      productId: item.product_id,
                      slug: product.slug || `product-${item.product_id}`,
                      variantId: item.variant_id,
                      quantity: item.quantity,
                      price: product.discount_price || product.price || 0,
                      name: product.name || "Ürün bulunamadı",
                      image: images && images[0] ? images[0].url : "/placeholder.svg",
                      storeName,
                      storeId,
                      storeSlug: storeSlug || `store-${storeId}`,
                      variantName,
                      options,
                      categoryId: product.category_id,
                    }
                  } catch (itemError: any) {
                    console.error(`Sepet öğesi işlenirken hata (${item.id}):`, itemError)
                    return null
                  }
                }),
              )

              const validItems = formattedItems.filter((item) => item !== null) as CartItem[]
              setCartItems(validItems)
              console.log("Sepet yüklendi, öğe sayısı:", validItems.length)
            } else {
              setCartItems([])
            }
          }
        } catch (dbError: any) {
          console.error("Veritabanı sepeti yüklenirken hata:", dbError)
          toast({
            title: "Sepet yüklenemedi",
            description: `Bir hata oluştu: ${dbError.message || "Bilinmeyen hata"}`,
            variant: "destructive",
          })
          setError(dbError.message || "Sepet veritabanından yüklenemedi")
          const storedCart = localStorage.getItem("cart")
          if (storedCart) {
            try {
              setCartItems(JSON.parse(storedCart))
            } catch (e) {
              setCartItems([])
            }
          }
        }
      } else {
        const storedCart = localStorage.getItem("cart")
        if (storedCart) {
          try {
            setCartItems(JSON.parse(storedCart))
          } catch (parseError: any) {
            console.error("Yerel sepet ayrıştırılırken hata:", parseError)
            localStorage.removeItem("cart")
            setCartItems([])
          }
        } else {
          setCartItems([])
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || "Bilinmeyen bir hata oluştu"
      console.error("Sepet yüklenirken hata:", errorMessage, error)
      setError(errorMessage)
      toast({
        title: "Sepet yüklenemedi",
        description: errorMessage,
        variant: "destructive",
      })
      setCartItems([])
    } finally {
      setLoading(false)
      setIsInitialized(true)
      console.log("Sepet yükleme tamamlandı, öğe sayısı:", cartItems.length)
    }
  }, [user, authLoading, toast, supabase])

  const reloadCart = useCallback(async () => {
    console.log("Sepet yeniden yükleniyor...")
    setLoadAttempts((prev) => prev + 1)
    try {
      await loadCart()
      console.log("Sepet yeniden yüklendi, öğe sayısı:", cartItems.length)
    } catch (error) {
      console.error("Sepet yeniden yüklenirken hata:", error)
      toast({
        title: "Sepet yenilenemedi",
        description: "Lütfen sayfayı yenileyip tekrar deneyin.",
        variant: "destructive",
      })
    }
  }, [loadCart, cartItems.length, toast])

  useEffect(() => {
    if (!authLoading) {
      loadCart()
    }
  }, [loadCart, authLoading, loadAttempts])

  useEffect(() => {
    if (!loading && isInitialized) {
      try {
        localStorage.setItem("cart", JSON.stringify(cartItems))
        console.log("Sepet localStorage'a kaydedildi, öğe sayısı:", cartItems.length)
      } catch (error) {
        console.error("Sepet localStorage'a kaydedilirken hata:", error)
      }
    }
  }, [cartItems, loading, isInitialized])

  const addToCart = async (item: Omit<CartItem, "id">) => {
    try {
      if (user) {
        let cartId: string | null = null
        try {
          cartId = await createCartSafely(user.id)
          if (!cartId) throw new Error("Cart ID bulunamadı!")
          console.log("Kullanıcı cartId:", cartId)
        } catch (cartError: any) {
          toast({ title: "Sepet oluşturulamadı", description: cartError.message, variant: "destructive" })
          console.error("Sepet oluşturulamadı:", cartError)
          throw cartError
        }

        if (cartId === "local-cart") {
          // Local cart için aynı ürün+varyant varsa miktarı artır, yoksa yeni satır ekle
          const existingIndex = cartItems.findIndex(
            (ci) => ci.productId === item.productId && ci.variantId === item.variantId
          );
          if (existingIndex !== -1) {
            // Aynı ürün ve varyant varsa miktarı artır
            const updatedItems = [...cartItems];
            updatedItems[existingIndex].quantity += item.quantity;
            setCartItems(updatedItems);
            toast({ title: "Ürün sepete eklendi (yerel)", description: item.name });
          } else {
            // Farklı varyant ise yeni satır olarak ekle
            setCartItems([
              ...cartItems,
              { ...item, id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` },
            ]);
            toast({ title: "Ürün sepete eklendi (yerel)", description: item.name });
          }
        } else {
          const { data: existing, error: findError } = await supabase
            .from("cart_items")
            .select("id, quantity")
            .eq("cart_id", cartId)
            .eq("product_id", String(item.productId)) // String'e çevirin
            .eq("variant_id", item.variantId ? String(item.variantId) : null)
            .maybeSingle()
          console.log("Var olan cart_item:", existing, "Hata:", findError)

          if (findError) {
            toast({ title: "Sepet kontrol hatası", description: findError.message, variant: "destructive" })
            console.error("Sepet kontrol hatası:", findError)
            throw findError
          }

          if (existing && existing.id) {
            const { error: updateError } = await supabase
              .from("cart_items")
              .update({ quantity: existing.quantity + item.quantity })
              .eq("id", existing.id)
            if (updateError) {
              toast({ title: "Sepete eklenemedi", description: updateError.message, variant: "destructive" })
              console.error("Sepete eklenemedi (update):", updateError)
              throw updateError
            }
          } else {
            const { data: insertData, error: addError } = await supabase
              .from("cart_items")
              .insert({
                cart_id: cartId,
                product_id: String(item.productId), // String'e çevirin
                variant_id: item.variantId ? String(item.variantId) : null,
                quantity: item.quantity,
              })
              .select("id")
              .single()
            console.log("Insert sonucu:", insertData, "Hata:", addError)
            if (addError) {
              toast({ title: "Sepete eklenemedi", description: addError.message, variant: "destructive" })
              console.error("Sepete eklenemedi (insert):", addError)
              throw addError
            }
          }
          await reloadCart()
          toast({ title: "Ürün sepete eklendi", description: item.name })
        }
      } else {
        // Local cart için aynı ürün+varyant varsa miktarı artır, yoksa yeni satır ekle
        const existingIndex = cartItems.findIndex(
          (ci) => ci.productId === item.productId && ci.variantId === item.variantId
        );
        if (existingIndex !== -1) {
          // Aynı ürün ve varyant varsa miktarı artır
          const updatedItems = [...cartItems];
          updatedItems[existingIndex].quantity += item.quantity;
          setCartItems(updatedItems);
          toast({ title: "Ürün sepete eklendi (yerel)", description: item.name });
        } else {
          // Farklı varyant ise yeni satır olarak ekle
          setCartItems([
            ...cartItems,
            { ...item, id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` },
          ]);
          toast({ title: "Ürün sepete eklendi (yerel)", description: item.name });
        }
      }
    } catch (error: any) {
      toast({
        title: "Sepete eklenemedi",
        description: error.message || "Bilinmeyen bir hata oluştu.",
        variant: "destructive",
      })
      console.error("Sepete eklenemedi:", error)
    }
  }

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      if (quantity < 1) return removeFromCart(itemId)

      const isLocalItem = itemId.startsWith("local-")

      if (user && !isLocalItem) {
        const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", itemId)
        if (error) throw error
      }

      const updatedItems = cartItems.map((item) => (item.id === itemId ? { ...item, quantity } : item))
      setCartItems(updatedItems)
    } catch (error: any) {
      console.error("Error updating quantity:", error)
      const updatedItems = cartItems.map((item) => (item.id === itemId ? { ...item, quantity } : item))
      setCartItems(updatedItems)
      toast({
        title: "Miktar yerel olarak güncellendi",
        description: "Veritabanı güncellenemedi, ancak miktar yerel olarak güncellendi.",
        variant: "default",
      })
    }
  }

  const removeFromCart = async (itemId: string) => {
    try {
      const isLocalItem = itemId.startsWith("local-")

      if (user && !isLocalItem) {
        const { error } = await supabase.from("cart_items").delete().eq("id", itemId)
        if (error) throw error
      }

      const updatedItems = cartItems.filter((item) => item.id !== itemId)
      setCartItems(updatedItems)
      toast({
        title: "Ürün sepetten kaldırıldı",
        description: "Ürün sepetinizden kaldırıldı.",
      })
    } catch (error: any) {
      console.error("Error removing from cart:", error)
      const updatedItems = cartItems.filter((item) => item.id !== itemId)
      setCartItems(updatedItems)
      toast({
        title: "Ürün yerel olarak kaldırıldı",
        description: "Veritabanından kaldırılamadı, ancak ürün yerel sepetinizden kaldırıldı.",
        variant: "default",
      })
    }
  }

  const clearCart = async () => {
    try {
      if (user) {
        const { data: cartData, error: cartError } = await supabase
          .from("carts")
          .select("id")
          .eq("user_id", user.id)
          .single()

        if (cartError && cartError.code !== "PGRST116") {
          console.warn("Error getting cart for clearing:", cartError.message)
        } else if (cartData?.id) {
          const { error } = await supabase.from("cart_items").delete().eq("cart_id", cartData.id)
          if (error) console.error("Error clearing cart items:", error.message)
        }
      }

      setCartItems([])
      localStorage.removeItem("cart")
      toast({
        title: "Sepet temizlendi",
        description: "Sepetinizdeki tüm ürünler kaldırıldı.",
      })
    } catch (error: any) {
      console.error("Error clearing cart:", error)
      setCartItems([])
      localStorage.removeItem("cart")
      toast({
        title: "Sepet yerel olarak temizlendi",
        description: "Veritabanı temizlenemedi, ancak yerel sepetiniz temizlendi.",
        variant: "default",
      })
    }
  }

  return (
    <CartContext.Provider
      value={{
        cartItems: cartItems || [],
        cartItemsCount,
        cartTotal,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        loading: loading || authLoading,
        error,
        reloadCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}
