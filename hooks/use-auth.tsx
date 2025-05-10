"use client"

import type * as React from "react"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

// Shadcn UI Dialog bileşenleri (Modal için)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  // DialogClose, // İsteğe bağlı
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

type User = {
  id: string
  email: string
  fullName?: string | null
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
  checkAndPromptForFullName: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  initialLoadComplete: false,
  isAdmin: false,
  isSeller: false,
  signIn: async () => ({ success: false, message: "" }),
  signUp: async () => ({ success: false, message: "" }),
  signOut: async () => { },
  refreshProfile: async () => { },
  updateProfile: async () => ({ success: false }),
  checkAndPromptForFullName: () => { },
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

  // Modal state'leri
  const [isFullNameModalOpen, setIsFullNameModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [isUpdatingFullName, setIsUpdatingFullName] = useState(false);

  // fetchProfile'ın AuthProvider kapsamında tanımlı olduğunu varsayıyoruz
  const fetchProfile = useCallback(async (userId: string) => {
    console.log("Fetching profile for user:", userId)
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()
      if (profileError) {
        console.error("Error fetching profile from database:", profileError)
        // API fallback'i burada olabilir veya kaldırılabilir, şimdilik basit tutuyoruz
        return null
      }
      console.log("Profile fetched from database:", profileData)
      return profileData
    } catch (error) {
      console.error("Unexpected error fetching profile:", error)
      return null
    }
  }, [supabase]);

  const originalLoadUserFromSession = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        setUser(null); setIsAdmin(false); setIsSeller(false);
        return;
      }

      if (!session?.user) {
        console.log("No active session");
        setUser(null); setIsAdmin(false); setIsSeller(false);
        return;
      }

      console.log("Session found, user ID:", session.user.id);
      const profileData = await fetchProfile(session.user.id);

      if (profileData) {
        const userRole = profileData.role || "user";
        const userObj: User = {
          id: session.user.id,
          email: session.user.email!,
          fullName: profileData.full_name,
          role: userRole,
          avatarUrl: profileData.avatar_url,
        };
        setUser(userObj);
        setIsAdmin(userRole === "admin");
        setIsSeller(userRole === "seller");

        if (!profileData.full_name || profileData.full_name.trim() === "") {
          console.log("User full name is missing, prompting for update.");
          setNewFullName("");
          setIsFullNameModalOpen(true);
        }
      } else {
        console.warn(`CRITICAL: Profile not found for authenticated user ${session.user.id}. Signing out.`);
        toast({ title: "Oturum Sorunu", description: "Kullanıcı profiliniz bulunamadı. Oturumunuz sonlandırılıyor.", variant: "destructive" });
        await supabase.auth.signOut();
        setUser(null); setIsAdmin(false); setIsSeller(false);
      }
    } catch (error) {
      console.error("Error in loadUserFromSession:", error);
      setUser(null); setIsAdmin(false); setIsSeller(false);
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }, [supabase, fetchProfile, toast]); // fetchProfile bağımlılıklara eklendi

  const updateProfile = useCallback(async ({ fullName, avatarUrl }: { fullName?: string; avatarUrl?: string }): Promise<{ success: boolean; error?: string }> => {
    // Bu fonksiyonun içeriğinin zaten var olduğunu ve doğru çalıştığını varsayıyoruz.
    // Önemli olan, çağrıldığında loadUserFromSession'ı tetiklemesi veya user state'ini güncellemesi.
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return { success: false, error: "Kullanıcı bulunamadı." };

      const updates: { full_name?: string; avatar_url?: string; updated_at: string } = { updated_at: new Date().toISOString() };
      if (fullName !== undefined) updates.full_name = fullName;
      if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

      const { error } = await supabase.from("profiles").update(updates).eq("id", session.user.id);
      if (error) return { success: false, error: error.message };

      await originalLoadUserFromSession(); // Profili ve state'i yenile
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Profil güncellenemedi." };
    } finally {
      setLoading(false);
    }
  }, [supabase, originalLoadUserFromSession]); // originalLoadUserFromSession bağımlılıklara eklendi


  const handleUpdateFullName = async () => {
    if (!newFullName.trim()) {
      toast({ title: "Hata", description: "Ad Soyad boş olamaz.", variant: "destructive" });
      return;
    }
    if (!user) return;

    setIsUpdatingFullName(true);
    const result = await updateProfile({ fullName: newFullName });
    setIsUpdatingFullName(false);

    if (result.success) {
      toast({ title: "Başarılı", description: "Ad Soyad güncellendi." });
      setIsFullNameModalOpen(false);
    } else {
      toast({ title: "Hata", description: result.error || "Ad Soyad güncellenemedi.", variant: "destructive" });
    }
  };

  const checkAndPromptForFullName = useCallback(() => {
    if (initialLoadComplete && user && (!user.fullName || user.fullName.trim() === "")) {
      console.log("Checking and prompting for full name (manual call).");
      setNewFullName(user.fullName || "");
      setIsFullNameModalOpen(true);
    }
  }, [user, initialLoadComplete]);

  const signIn = useCallback(async (email: string, password: string) => {
    // Mevcut signIn fonksiyonunuz
    // Başarılı giriş sonrası originalLoadUserFromSession() çağrılmalı
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { /* ...hata yönetimi... */ return { success: false, message: error.message }; }
      await originalLoadUserFromSession();
      return { success: true, message: "Giriş başarılı" };
    } catch (error: any) { /* ...hata yönetimi... */ return { success: false, message: error.message }; }
    finally { setLoading(false); }
  }, [supabase, originalLoadUserFromSession]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    // Mevcut signUp fonksiyonunuz
    // Başarılı kayıt sonrası originalLoadUserFromSession() çağrılmalı (veya yönlendirme sonrası login'de zaten olacak)
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
      if (error) { /* ...hata yönetimi... */ return { success: false, message: error.message }; }
      // Genellikle signUp sonrası otomatik login olmaz, e-posta onayı beklenir.
      // E-posta onayı sonrası ilk girişte originalLoadUserFromSession çalışacak.
      return { success: true, message: "Kayıt başarılı, e-postanızı kontrol edin." };
    } catch (error: any) { /* ...hata yönetimi... */ return { success: false, message: error.message }; }
    finally { setLoading(false); }
  }, [supabase]);

  const signOut = useCallback(async () => {
    // Mevcut signOut fonksiyonunuz
    await supabase.auth.signOut();
    setUser(null); setIsAdmin(false); setIsSeller(false); setInitialLoadComplete(false);
    router.push('/'); // Ana sayfaya yönlendir
  }, [supabase, router]);

  const refreshProfile = useCallback(async () => {
    // Bu fonksiyon originalLoadUserFromSession'ı çağırmalı
    await originalLoadUserFromSession();
  }, [originalLoadUserFromSession]);

  useEffect(() => {
    originalLoadUserFromSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session);
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        originalLoadUserFromSession();
      } else if (event === "SIGNED_OUT") {
        setUser(null); setIsAdmin(false); setIsSeller(false); setInitialLoadComplete(true);
      }
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, [originalLoadUserFromSession, supabase.auth]);

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
        checkAndPromptForFullName,
      }}
    >
      {children}
      <Dialog open={isFullNameModalOpen} onOpenChange={setIsFullNameModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ad Soyad Belirleyin</DialogTitle>
            <DialogDescription>
              Devam etmek için lütfen adınızı ve soyadınızı girin. Bu bilgi profilinizde görünecektir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newFullName">Ad Soyad</Label>
              <Input
                id="newFullName"
                placeholder="Adınız ve Soyadınız"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                disabled={isUpdatingFullName}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button type="button" onClick={handleUpdateFullName} disabled={isUpdatingFullName}>
              {isUpdatingFullName ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext)
}
