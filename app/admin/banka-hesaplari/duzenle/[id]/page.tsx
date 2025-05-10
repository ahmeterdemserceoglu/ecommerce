"use client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { updateManagedBankAccount, deleteManagedBankAccount } from "@/app/actions/admin-actions";

export default function EditManagedBankAccountPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const id = params.id as string;
    const [loading, setLoading] = useState(true);
    const [account, setAccount] = useState<any>(null);
    const [form, setForm] = useState<any>({});
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        async function fetchAccount() {
            setLoading(true);
            const res = await fetch(`/api/admin/banka-hesaplari/${id}`);
            const data = await res.json();
            if (data.account) {
                setAccount(data.account);
                setForm({
                    bank_name: data.account.bank_name || "",
                    account_holder_name: data.account.account_holder_name || "",
                    iban: data.account.iban || "",
                    account_number: data.account.account_number || "",
                    branch_code: data.account.branch_code || "",
                    swift_bic_code: data.account.swift_bic_code || "",
                    currency: data.account.currency || "TRY",
                    instructions: data.account.instructions || "",
                    is_active: !!data.account.is_active,
                });
            }
            setLoading(false);
        }
        fetchAccount();
    }, [id]);

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setForm((prev: any) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setSubmitting(true);
        const formData = new FormData();
        Object.entries(form).forEach(([key, value]) => {
            formData.append(key, value as string);
        });
        const result = await updateManagedBankAccount(id, formData);
        setSubmitting(false);
        if (result.success) {
            toast({ title: "Başarılı", description: result.message });
            router.push("/admin/banka-hesaplari");
            router.refresh();
        } else {
            toast({ title: "Hata", description: result.message, variant: "destructive" });
        }
    };

    const handleDelete = async () => {
        if (!confirm("Bu banka hesabını silmek istediğinize emin misiniz?")) return;
        setDeleting(true);
        const result = await deleteManagedBankAccount(id);
        setDeleting(false);
        if (result.success) {
            toast({ title: "Silindi", description: result.message });
            router.push("/admin/banka-hesaplari");
            router.refresh();
        } else {
            toast({ title: "Hata", description: result.message, variant: "destructive" });
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="container mx-auto py-10">Yükleniyor...</div>
            </AdminLayout>
        );
    }
    if (!account) {
        return (
            <AdminLayout>
                <div className="container mx-auto py-10">Hesap bulunamadı.</div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="container mx-auto py-10">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Banka Hesabını Düzenle</h1>
                    <div className="flex gap-2">
                        <Button asChild variant="outline">
                            <Link href="/admin/banka-hesaplari">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Geri Dön
                            </Link>
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deleting ? "Siliniyor..." : "Hesabı Sil"}
                        </Button>
                    </div>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Banka Hesap Bilgileri</CardTitle>
                        <CardDescription>
                            Bu sayfadan mevcut banka hesabı bilgilerini güncelleyebilirsiniz.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block font-medium mb-1">Banka Adı *</label>
                                    <Input name="bank_name" value={form.bank_name} onChange={handleChange} required />
                                </div>
                                <div>
                                    <label className="block font-medium mb-1">Hesap Sahibi Adı *</label>
                                    <Input name="account_holder_name" value={form.account_holder_name} onChange={handleChange} required />
                                </div>
                            </div>
                            <div>
                                <label className="block font-medium mb-1">IBAN *</label>
                                <Input name="iban" value={form.iban} onChange={handleChange} required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block font-medium mb-1">Hesap Numarası</label>
                                    <Input name="account_number" value={form.account_number} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block font-medium mb-1">Şube Kodu</label>
                                    <Input name="branch_code" value={form.branch_code} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block font-medium mb-1">SWIFT/BIC Kodu</label>
                                    <Input name="swift_bic_code" value={form.swift_bic_code} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block font-medium mb-1">Para Birimi *</label>
                                    <Input name="currency" value={form.currency} onChange={handleChange} required />
                                </div>
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Talimatlar</label>
                                <Textarea name="instructions" value={form.instructions} onChange={handleChange} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch checked={form.is_active} onCheckedChange={v => setForm((f: any) => ({ ...f, is_active: v }))} />
                                <span>Hesap Aktif mi?</span>
                            </div>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? "Güncelleniyor..." : "Güncelle"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
} 