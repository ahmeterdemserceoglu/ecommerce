import { AddManagedBankAccountForm } from "@/components/admin/forms/add-managed-bank-account-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

export default function AddManagedBankAccountPage() {
    return (
        <AdminLayout>
            <div className="container mx-auto py-10">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Yeni Havuz Hesabı Ekle</h1>
                    <Button asChild variant="outline">
                        <Link href="/admin/banka-hesaplari">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Geri Dön
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Banka Hesap Bilgileri</CardTitle>
                        <CardDescription>
                            Müşteri ödemelerinin toplanacağı yeni bir banka hesabı ekleyin.
                            Bu hesap, pazar yerinin ana havuz hesabı olarak kullanılacaktır.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AddManagedBankAccountForm />
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
} 