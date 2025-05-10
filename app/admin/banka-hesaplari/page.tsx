import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import type { Database } from "@/types/supabase";
import AdminLayout from "@/components/admin/AdminLayout"

export const dynamic = "force-dynamic";

type ManagedBankAccount = Database["public"]["Tables"]["managed_bank_accounts"]["Row"];

// Helper function to get auth context directly (for debugging)
async function getAuthContextForDebug(supabase: any) {
    // Supabase doesn't directly expose auth.uid() or auth.role() via a simple select
    // on the client. We need to call a pg function or use rpc.
    // Let's create a simple function in SQL if it doesn't exist, or use an existing one.
    // For now, we'll try to get the session user ID which *should* translate to auth.uid()
    // and rely on the profile check for the role.
    // A more direct way would be to create a SQL function:
    // CREATE OR REPLACE FUNCTION get_current_auth_uid() RETURNS text AS $$
    // SELECT auth.uid()::text;
    // $$ LANGUAGE sql STABLE;
    // Then call it via rpc: const { data, error } = await supabase.rpc('get_current_auth_uid');

    // Simpler approach for now: just re-fetch session info as a proxy
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) return { uid: `Error fetching session: ${sessionError.message}`, role: "Error" };
    if (!session) return { uid: "No active session for debug", role: "No session" };

    // Additionally, let's try calling a dummy RPC to see what auth.role() is
    // This requires a function in your DB:
    // CREATE OR REPLACE FUNCTION get_current_auth_role() RETURNS TEXT AS $$
    // BEGIN RETURN auth.role(); END;
    // $$ LANGUAGE plpgsql;
    let authRoleFromRpc = "N/A (RPC not called or function missing)";
    try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_current_auth_role');
        if (rpcError) {
            authRoleFromRpc = `RPC Error: ${rpcError.message}`;
        } else {
            authRoleFromRpc = rpcData;
        }
    } catch (e: any) {
        authRoleFromRpc = `RPC Exception: ${e.message}`;
    }


    return {
        uid_from_session: session.user.id,
        role_from_session_user: session.user.role, // This is JWT role, not necessarily DB role via auth.role()
        auth_role_from_rpc: authRoleFromRpc
    };
}

export default async function AdminBankAccountsPage() {
    const supabase = createServerComponentClient<Database>({ cookies });

    const debugAuthContext = await getAuthContextForDebug(supabase);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return (
            <div>
                <p>Yetkilendirme gerekiyor.</p>
                <pre>Debug Auth Context: {JSON.stringify(debugAuthContext, null, 2)}</pre>
            </div>
        );
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

    if (profileError || !profile || profile.role !== "admin") {
        return (
            <div>
                <p>Bu sayfayı görüntüleme yetkiniz yok.</p>
                <p>User ID from session: {session.user.id}</p>
                <p>Profile fetched: {JSON.stringify(profile)}</p>
                <p>Profile error: {JSON.stringify(profileError)}</p>
                <pre>Debug Auth Context: {JSON.stringify(debugAuthContext, null, 2)}</pre>
            </div>
        );
    }

    const { data: accounts, error } = await supabase
        .from("managed_bank_accounts")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Banka hesapları çekilirken hata:", error);
    }

    return (
        <AdminLayout>
            <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
                {/* DEBUG INFO DISPLAY */}
                <Card className="mb-6 bg-yellow-50 border-yellow-200">
                    <CardHeader>
                        <CardTitle className="text-yellow-700">Auth Debug Info (Server Component Context)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="text-sm text-yellow-800">
                            {JSON.stringify(debugAuthContext, null, 2)}
                        </pre>
                        <p className="text-xs text-yellow-600 mt-2">
                            Note: `session.user.role` is from the JWT. `auth_role_from_rpc` attempts to get `auth.role()` directly from the database via an RPC call.
                            Ensure the PostgreSQL function `get_current_auth_role()` exists for the RPC call to succeed.
                        </p>
                    </CardContent>
                </Card>
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">Yönetilen Banka Hesapları</h1>
                    <Button asChild>
                        <Link href="/admin/banka-hesaplari/ekle">
                            <PlusCircle className="mr-2 h-4 w-4" /> Yeni Hesap Ekle
                        </Link>
                    </Button>
                </div>

                {error && (
                    <Card className="mb-4 bg-red-50 border-red-200">
                        <CardHeader>
                            <CardTitle className="text-red-700">Veri Çekme Hatası</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-red-600">Banka hesapları listelenirken bir sorun oluştu: {error.message}</p>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Hesap Listesi</CardTitle>
                        <CardDescription>
                            Havale/EFT için kullanılacak banka hesaplarını buradan yönetebilirsiniz.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {accounts && accounts.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Banka Adı</TableHead>
                                        <TableHead>Hesap Sahibi</TableHead>
                                        <TableHead>IBAN</TableHead>
                                        <TableHead>Para Birimi</TableHead>
                                        <TableHead>Durum</TableHead>
                                        <TableHead className="text-right">İşlemler</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {accounts.map((account: ManagedBankAccount) => (
                                        <TableRow key={account.id}>
                                            <TableCell className="font-medium">{account.bank_name}</TableCell>
                                            <TableCell>{account.account_holder_name}</TableCell>
                                            <TableCell>{account.iban}</TableCell>
                                            <TableCell>{account.currency}</TableCell>
                                            <TableCell>
                                                <Badge variant={account.is_active ? "default" : "outline"} className={account.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                                                    {account.is_active ? "Aktif" : "Pasif"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" asChild className="mr-2">
                                                    <Link href={`/admin/banka-hesaplari/duzenle/${account.id}`}>
                                                        <Edit className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                {/* Silme işlemi için ayrı bir component ve server action gerekir */}
                                                {/* <Button variant="ghost" size="icon" disabled> <Trash2 className="h-4 w-4 text-red-500" /> </Button> */}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-muted-foreground">Henüz eklenmiş banka hesabı bulunmuyor.</p>
                                <Button asChild className="mt-4">
                                    <Link href="/admin/banka-hesaplari/ekle">
                                        <PlusCircle className="mr-2 h-4 w-4" /> İlk Hesabı Ekle
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
} 