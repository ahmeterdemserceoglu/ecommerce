"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/use-auth';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
    Users,
    Store,
    ShoppingBag,
    DollarSign,
    Settings,
    AlertCircle,
    LayoutDashboard,
    LogOut,
    Bell,
    Tag,
    Database,
    FileText,
    Menu,
    X,
    Loader2,
    Ticket,
    CreditCard,
    Home,
    Gift,
    ReceiptText,
    Banknote,
    ShieldCheck,
    Coins,
    Layers,
    ClipboardList,
    UserCog,
    Percent,
    Wallet,
    Building2,
    BadgePercent,
    KeyRound,
    Cog,
    UsersRound,
    Store as StoreIcon,
    Tag as TagIcon,
    Bell as BellIcon,
    AlertCircle as AlertIcon,
    FileText as FileTextIcon,
    Database as DatabaseIcon,
    CreditCard as CreditCardIcon,
    Settings as SettingsIcon,
    DollarSign as DollarSignIcon,
    Home as HomeIcon,
    Ticket as TicketIcon,
    Gift as GiftIcon,
    ReceiptText as ReceiptTextIcon,
    Banknote as BanknoteIcon,
    ShieldCheck as ShieldCheckIcon,
    Coins as CoinsIcon,
    Layers as LayersIcon,
    ClipboardList as ClipboardListIcon,
    UserCog as UserCogIcon,
    Percent as PercentIcon,
    Wallet as WalletIcon,
    Building2 as Building2Icon,
    BadgePercent as BadgePercentIcon,
    KeyRound as KeyRoundIcon,
    Cog as CogIcon,
    UsersRound as UsersRoundIcon,
} from 'lucide-react';

interface AdminLayoutProps {
    children: React.ReactNode;
    // Optional: if some pages need to pass specific data to the layout, like pending counts
    // pendingApplicationsCount?: number; 
}

const sidebarItemsBase = [
    { icon: <HomeIcon className="h-5 w-5" />, label: "Dashboard", href: "/admin/dashboard" },
    { icon: <UsersRoundIcon className="h-5 w-5" />, label: "Kullanıcılar", href: "/admin/users" },
    { icon: <StoreIcon className="h-5 w-5" />, label: "Mağazalar", href: "/admin/stores" },
    { icon: <ShoppingBag className="h-5 w-5" />, label: "Ürünler", href: "/admin/products" },
    { icon: <TagIcon className="h-5 w-5" />, label: "Kategoriler", href: "/admin/categories" },
    { icon: <BadgePercentIcon className="h-5 w-5" />, label: "Kuponlar", href: "/admin/coupons" },
    { icon: <BellIcon className="h-5 w-5" />, label: "Duyurular", href: "/admin/panel/duyurular" },
    {
        icon: <AlertIcon className="h-5 w-5" />,
        label: "Satıcı Başvuruları",
        href: "/admin/panel/satici-basvurulari",
        // Badge count will be handled by fetching directly or via prop
    },
    { icon: <DollarSignIcon className="h-5 w-5" />, label: "Ödeme Talepleri", href: "/admin/payouts" },
    { icon: <ReceiptTextIcon className="h-5 w-5" />, label: "Siparişler", href: "/admin/orders" },
    { icon: <DatabaseIcon className="h-5 w-5" />, label: "Veritabanı", href: "/admin/database" },
    { icon: <CreditCardIcon className="h-5 w-5" />, label: "İyzico Ayarları", href: "/admin/banka-hesaplari" },
    { icon: <CogIcon className="h-5 w-5" />, label: "Ayarlar", href: "/admin/settings" },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading: userLoading, signOut } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [pendingApplications, setPendingApplications] = useState(0);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const checkAdminAuthAndFetchData = async () => {
            if (userLoading) return;

            if (!user) {
                router.push(`/auth/login?returnTo=${pathname}`);
                return;
            }

            try {
                const { data: profileData, error: profileError } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();

                if (profileError || !profileData || profileData.role !== "admin") {
                    console.error("AdminLayout: Yetki hatası veya profil alınamadı.", profileError);
                    router.push("/"); // Redirect to home if not admin
                    return;
                }

                // Fetch pending applications count
                const { count, error: countError } = await supabase
                    .from('seller_applications')
                    .select('id', { count: 'exact', head: true })
                    .eq('status', 'PENDING_APPROVAL');

                if (countError) {
                    console.error("AdminLayout: Bekleyen başvurular sayısı alınamadı:", countError);
                } else {
                    setPendingApplications(count || 0);
                }

                setAuthChecked(true);
            } catch (error) {
                console.error("AdminLayout: Yetki kontrolü sırasında hata:", error);
                router.push("/");
            } finally {
                setIsCheckingAuth(false);
            }
        };

        checkAdminAuthAndFetchData();
    }, [user, userLoading, router, pathname, supabase]);

    const sidebarItems = sidebarItemsBase.map(item => {
        if (item.label === "Satıcı Başvuruları") {
            return { ...item, badge: pendingApplications > 0 ? pendingApplications : undefined };
        }
        return item;
    });

    if (isCheckingAuth || userLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="h-12 w-12 text-orange-500 animate-spin mb-4" />
                <h2 className="text-xl font-bold">Admin Paneli Yükleniyor...</h2>
                <p className="text-gray-500">Yetkiler kontrol ediliyor ve veriler hazırlanıyor.</p>
            </div>
        );
    }

    if (!authChecked) {
        // This case should ideally be handled by redirects in checkAdminAuthAndFetchData
        // but as a fallback:
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <AlertIcon className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">Erişim Reddedildi</h2>
                <p className="text-gray-500 max-w-md text-center">
                    Admin paneline erişim yetkiniz bulunmuyor veya oturumunuz sonlanmış olabilir.
                </p>
                <Button onClick={() => router.push(`/auth/login?returnTo=${pathname}`)} className="mt-4">
                    Giriş Yap
                </Button>
            </div>
        );
    }


    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r">
                <div className="p-4 border-b">
                    <Link href="/admin/dashboard">
                        <h1 className="text-xl font-bold cursor-pointer">Admin Panel</h1>
                    </Link>
                </div>
                <div className="flex-1 overflow-y-auto py-4">
                    <nav className="px-2 space-y-1">
                        {sidebarItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href))
                                    ? "bg-gray-100 dark:bg-gray-700 text-primary"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    }`}
                            >
                                {item.icon}
                                <span className="ml-3">{item.label}</span>
                                {item.badge ? (
                                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">{item.badge}</span>
                                ) : null}
                            </Link>
                        ))}
                    </nav>
                </div>
                <div className="p-4 border-t">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={async () => {
                            await signOut();
                            router.push('/auth/login');
                        }}
                    >
                        <LogOut className="h-5 w-5 mr-3" />
                        Çıkış Yap
                    </Button>
                </div>
            </div>

            {/* Mobile Sidebar */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetContent side="left" className="p-0 w-64">
                    <div className="p-4 border-b flex items-center justify-between">
                        <Link href="/admin/dashboard">
                            <h1 className="text-xl font-bold cursor-pointer">Admin Panel</h1>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto py-4">
                        <nav className="px-2 space-y-1">
                            {sidebarItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href))
                                        ? "bg-gray-100 dark:bg-gray-700 text-primary"
                                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        }`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {item.icon}
                                    <span className="ml-3">{item.label}</span>
                                    {item.badge ? (
                                        <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">{item.badge}</span>
                                    ) : null}
                                </Link>
                            ))}
                        </nav>
                    </div>
                    <div className="p-4 border-t">
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={async () => {
                                await signOut();
                                setIsMobileMenuOpen(false);
                                router.push('/auth/login');
                            }}
                        >
                            <LogOut className="h-5 w-5 mr-3" />
                            Çıkış Yap
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden bg-white dark:bg-gray-800 border-b p-4 flex items-center justify-between">
                    <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
                        <Menu className="h-6 w-6" />
                    </Button>
                    <Link href="/admin/dashboard">
                        <h1 className="text-xl font-bold cursor-pointer">Admin Panel</h1>
                    </Link>
                    <div className="w-6"></div> {/* Spacer for alignment */}
                </div>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
                    {children}
                </main>
            </div>
        </div>
    );
} 