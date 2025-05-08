"use client"

import type * as React from "react"

import { createContext, useContext, useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

type User = {
  id: string
  email: string
  fullName?: string
  role: "admin" | "seller" | "user"
  avatarUrl?: string
}

export type AuthContextType = {
  user: User | null
  loading: boolean
  initialLoadComplete: boolean
  isAdmin: boolean
  isSeller: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; message: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (profile: { fullName?: string; avatarUrl?: string }) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  initialLoadComplete: false,
  isAdmin: false,
  isSeller: false,
  signIn: async () => ({ success: false, message: "" }),
  signUp: async () => ({ success: false, message: "" }),
  signOut: async () => {},
  refreshProfile: async () => {},
  updateProfile: async () => ({ success: false }),
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSeller, setIsSeller] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  // Fetch profile from database
  const fetchProfile = async (userId: string) => {
    console.log("Fetching profile for user:", userId)

    try {
      // First try with direct database query
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (profileError) {
        console.error("Error fetching profile from database:", profileError)

        // Try with API as fallback
        try {
          const response = await fetch(`/api/auth/profile?userId=${userId}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
          })

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`)
          }

          const data = await response.json()
          if (data.profile) {
            console.log("Profile fetched from API:", data.profile)
            return data.profile
          } else {
            console.warn("No profile found via API")
            return null
          }
        } catch (apiError) {
          console.error("Error fetching profile from API:", apiError)
          return null
        }
      }

      console.log("Profile fetched from database:", profileData)
      return profileData
    } catch (error) {
      console.error("Unexpected error fetching profile:", error)
      return null
    }
  }

  // Create or update profile
  const createOrUpdateProfile = async (userData: any) => {
    if (!userData?.id || !userData?.email) {
      console.warn("Invalid user data for profile creation")
      return null
    }

    console.log("Creating/updating profile for user:", userData.id)

    try {
      // Try with API first
      const response = await fetch("/api/auth/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userData.id,
          email: userData.email,
          fullName: userData.user_metadata?.full_name || userData.email.split("@")[0],
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      console.log("Profile created/updated via API:", data.profile)
      return data.profile
    } catch (apiError) {
      console.error("Error with API, trying direct database insert:", apiError)

      // Fallback to direct database insert
      try {
        // Determine role based on email
        const role = userData.email.includes("admin") ? "admin" : userData.email.includes("seller") ? "seller" : "user"

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: userData.id,
            email: userData.email,
            full_name: userData.user_metadata?.full_name || userData.email.split("@")[0],
            role: role,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (profileError) {
          console.error("Database profile creation error:", profileError)
          return null
        }

        console.log("Profile created directly in database:", profileData)
        return profileData
      } catch (dbError) {
        console.error("Database profile creation exception:", dbError)
        return null
      }
    }
  }

  // Load user from session
  const loadUserFromSession = async () => {
    setLoading(true)
    try {
      console.log("Loading user from session")

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("Session error:", sessionError)
        setUser(null)
        setIsAdmin(false)
        setIsSeller(false)
        setLoading(false)
        setInitialLoadComplete(true)
        return
      }

      if (!session) {
        console.log("No active session")
        setUser(null)
        setIsAdmin(false)
        setIsSeller(false)
        setLoading(false)
        setInitialLoadComplete(true)
        return
      }

      console.log("Session found, user ID:", session.user.id)

      // Fetch profile
      const profileData = await fetchProfile(session.user.id)

      // If no profile, create one
      let finalProfileData = profileData
      if (!profileData) {
        console.log("No profile found, creating one")
        finalProfileData = await createOrUpdateProfile(session.user)
      }

      // Set user state
      if (finalProfileData) {
        const userRole = finalProfileData.role || "user"

        const userObj: User = {
          id: session.user.id,
          email: session.user.email!,
          fullName: finalProfileData.full_name,
          role: userRole,
          avatarUrl: finalProfileData.avatar_url,
        }

        console.log("Setting user state:", userObj)
        setUser(userObj)
        setIsAdmin(userRole === "admin")
        setIsSeller(userRole === "seller")

        console.log("User role:", userRole)
        console.log("Is admin:", userRole === "admin")
        console.log("Is seller:", userRole === "seller")
      } else {
        // Fallback if we couldn't get profile data
        console.warn("Using fallback user data from session")
        const fallbackRole = session.user.email?.includes("admin")
          ? "admin"
          : session.user.email?.includes("seller")
            ? "seller"
            : "user"

        setUser({
          id: session.user.id,
          email: session.user.email!,
          role: fallbackRole,
        })
        setIsAdmin(fallbackRole === "admin")
        setIsSeller(fallbackRole === "seller")

        console.log("Fallback user role:", fallbackRole)
        console.log("Is admin (fallback):", fallbackRole === "admin")
        console.log("Is seller (fallback):", fallbackRole === "seller")
      }
    } catch (error) {
      console.error("Error in loadUserFromSession:", error)
      setUser(null)
      setIsAdmin(false)
      setIsSeller(false)
    } finally {
      setLoading(false)
      setInitialLoadComplete(true)
    }
  }

  // Refresh profile
  const refreshProfile = async () => {
    try {
      setLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user?.id) {
        const profile = await fetchProfile(session.user.id)
        if (!profile) {
          await createOrUpdateProfile(session.user)
        }
        await loadUserFromSession()
      } else {
        setUser(null)
        setIsAdmin(false)
        setIsSeller(false)
      }
    } catch (error) {
      console.error("Error refreshing profile:", error)
    } finally {
      setLoading(false)
    }
  }

  // Sign in
  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      console.log("Signing in user:", email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Sign in error:", error)

        // Translate common Supabase error messages to user-friendly Turkish messages
        let errorMessage = error.message
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Geçersiz e-posta veya şifre. Lütfen bilgilerinizi kontrol edin."
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "E-posta adresiniz henüz onaylanmamış. Lütfen e-postanızı kontrol edin."
        } else if (error.message.includes("User not found")) {
          errorMessage = "Bu e-posta adresi ile kayıtlı bir hesap bulunamadı."
        } else if (error.message.includes("Invalid email")) {
          errorMessage = "Geçersiz e-posta formatı. Lütfen doğru bir e-posta adresi girin."
        } else if (error.message.includes("Too many requests")) {
          errorMessage = "Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin."
        }

        toast({
          title: "Giriş başarısız",
          description: errorMessage,
          variant: "destructive",
        })
        setLoading(false)
        return { success: false, message: errorMessage }
      }

      console.log("Sign in successful, loading user data")
      await loadUserFromSession()

      toast({
        title: "Giriş başarılı",
        description: "Hesabınıza başarıyla giriş yaptınız.",
      })

      return { success: true, message: "Giriş başarılı" }
    } catch (error: any) {
      console.error("Sign in exception:", error)

      // Handle any other exceptions
      const errorMessage = "Giriş yapılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin."

      toast({
        title: "Giriş başarısız",
        description: errorMessage,
        variant: "destructive",
      })
      setLoading(false)
      return { success: false, message: errorMessage }
    }
  }

  // Sign up
  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true)
    try {
      console.log("Signing up user:", email)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        console.error("Sign up error:", error)

        // Translate common Supabase error messages to user-friendly Turkish messages
        let errorMessage = error.message
        if (error.message.includes("Database error saving new user")) {
          errorMessage = "Kullanıcı kaydedilirken veritabanı hatası oluştu. Bu e-posta zaten kullanılıyor olabilir."
        } else if (error.message.includes("Password should be at least")) {
          errorMessage = "Şifre en az 6 karakter uzunluğunda olmalıdır."
        } else if (error.message.includes("User already registered")) {
          errorMessage = "Bu e-posta adresi ile kayıtlı bir kullanıcı zaten var."
        } else if (error.message.includes("Invalid email")) {
          errorMessage = "Geçersiz e-posta formatı. Lütfen doğru bir e-posta adresi girin."
        } else if (error.message.includes("Unable to validate email")) {
          errorMessage = "E-posta doğrulanamadı. Lütfen geçerli bir e-posta adresi girin."
        } else if (error.message.includes("duplicate key value violates unique constraint")) {
          errorMessage = "Bu e-posta adresi zaten kullanımda. Lütfen farklı bir e-posta adresi deneyin."
        }

        toast({
          title: "Kayıt başarısız",
          description: errorMessage,
          variant: "destructive",
        })
        setLoading(false)
        return { success: false, message: errorMessage }
      }

      console.log("Sign up successful, creating profile")

      // Create profile
      if (data.user) {
        await createOrUpdateProfile({
          id: data.user.id,
          email: data.user.email,
          user_metadata: { full_name: fullName },
        })
      }

      toast({
        title: "Kayıt başarılı",
        description: "Hesabınız başarıyla oluşturuldu. Lütfen e-posta adresinizi doğrulayın.",
      })

      setLoading(false)
      return { success: true, message: "Kayıt başarılı" }
    } catch (error: any) {
      console.error("Sign up exception:", error)

      // Handle any other exceptions
      let errorMessage = "Kayıt olurken bir hata oluştu. Lütfen daha sonra tekrar deneyin."

      // Check if it's a database error (could be a constraint violation)
      if (error.message && error.message.includes("database")) {
        errorMessage = "Bu e-posta adresi zaten kullanılıyor olabilir. Lütfen farklı bir e-posta ile deneyin."
      }

      toast({
        title: "Kay��t başarısız",
        description: errorMessage,
        variant: "destructive",
      })
      setLoading(false)
      return { success: false, message: errorMessage }
    }
  }

  // Sign out
  const signOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setUser(null)
      setIsAdmin(false)
      setIsSeller(false)
      setInitialLoadComplete(false)
      localStorage.clear()
      sessionStorage.clear()
      // Hem router.push hem de tam reload ile garanti
      router.push("/")
      setTimeout(() => {
        window.location.href = "/"
      }, 100)
    } catch (error: any) {
      console.error("Sign out error:", error)
      toast({
        title: "Çıkış yapılamadı",
        description: error.message || "Bilinmeyen bir hata oluştu",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Profil güncelleme fonksiyonu
  const updateProfile = async ({
    fullName,
    avatarUrl,
  }: { fullName?: string; avatarUrl?: string }): Promise<{ success: boolean; error?: string }> => {
    setLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        setLoading(false)
        return { success: false, error: "Kullanıcı bulunamadı." }
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id)
      if (error) {
        setLoading(false)
        return { success: false, error: error.message }
      }
      await loadUserFromSession()
      setLoading(false)
      return { success: true }
    } catch (err: any) {
      setLoading(false)
      return { success: false, error: err.message || "Profil güncellenemedi." }
    }
  }

  // Initialize
  useEffect(() => {
    console.log("Auth provider initialized")
    loadUserFromSession()

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event)

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        loadUserFromSession()
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setIsAdmin(false)
        setIsSeller(false)
        setInitialLoadComplete(true)
      }
    })

    return () => {
      console.log("Cleaning up auth provider")
      authListener.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        initialLoadComplete,
        isAdmin,
        isSeller,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
