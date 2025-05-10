'use client'

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/lib/supabase';
import { PlusCircle, Edit, Trash2, Loader2, Search } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import AdminLayout from "@/components/admin/AdminLayout"

export interface Coupon {
    id: string;
    code: string;
    description?: string | null;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    min_purchase_amount?: number | null;
    expiry_date?: string | null;
    max_uses?: number | null;
    uses_per_user?: number | null;
    current_uses: number;
    is_active: boolean;
    applicable_to: 'all_products' | 'specific_products' | 'specific_categories';
    applicable_product_ids?: string[] | null;
    applicable_category_ids?: string[] | null;
    created_at: string;
}

export default function AdminCouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();

    const fetchCoupons = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase.from('coupons').select('*').order('created_at', { ascending: false });
            if (searchTerm) {
                query = query.ilike('code', `%${searchTerm}%`);
            }
            const { data, error } = await query;
            if (error) throw error;
            setCoupons(data as Coupon[] || []);
        } catch (error: any) {
            console.error("Error fetching coupons:", error);
            toast({ title: "Hata", description: "Kuponlar yüklenirken bir sorun oluştu: " + error.message, variant: "destructive" });
        }
        setLoading(false);
    }, [searchTerm, toast]);

    useEffect(() => {
        fetchCoupons();
    }, [fetchCoupons]);

    const handleDeleteCoupon = async (couponId: string) => {
        try {
            const { error } = await supabase.from('coupons').delete().eq('id', couponId);
            if (error) throw error;
            toast({ title: "Başarılı", description: "Kupon başarıyla silindi." });
            fetchCoupons(); // Refresh the list
        } catch (error: any) {
            console.error("Error deleting coupon:", error);
            toast({ title: "Hata", description: "Kupon silinirken bir sorun oluştu: " + error.message, variant: "destructive" });
        }
    };

    return (
        <AdminLayout>
            <div className="container mx-auto py-8 px-4 md:px-6">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <CardTitle>Kupon Yönetimi</CardTitle>
                                <CardDescription>Oluşturulmuş indirim kuponlarını buradan yönetebilirsiniz.</CardDescription>
                            </div>
                            <Link href="/admin/coupons/new">
                                <Button><PlusCircle className="mr-2 h-4 w-4" /> Yeni Kupon Ekle</Button>
                            </Link>
                        </div>
                        <div className="mt-4 flex items-center">
                            <Input
                                placeholder="Kupon kodu ile ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="max-w-sm"
                            />
                            <Button onClick={fetchCoupons} variant="outline" className="ml-2">
                                <Search className="h-4 w-4 mr-2" /> Ara
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center items-center py-10">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="ml-2">Kuponlar yükleniyor...</p>
                            </div>
                        ) : coupons.length === 0 ? (
                            <p className="text-center text-gray-500 py-10">Henüz hiç kupon oluşturulmamış.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Kod</TableHead>
                                            <TableHead>Açıklama</TableHead>
                                            <TableHead>Tür</TableHead>
                                            <TableHead>Değer</TableHead>
                                            <TableHead>Bitiş Tarihi</TableHead>
                                            <TableHead>Durum</TableHead>
                                            <TableHead>Kullanım</TableHead>
                                            <TableHead className="text-right">İşlemler</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {coupons.map((coupon) => (
                                            <TableRow key={coupon.id}>
                                                <TableCell className="font-medium">{coupon.code}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{coupon.description || '-'}</TableCell>
                                                <TableCell>{coupon.discount_type === 'percentage' ? 'Yüzde' : 'Sabit Tutar'}</TableCell>
                                                <TableCell>
                                                    {coupon.discount_type === 'percentage'
                                                        ? `${coupon.discount_value}%`
                                                        : `${coupon.discount_value} TL`}
                                                </TableCell>
                                                <TableCell>{coupon.expiry_date ? format(new Date(coupon.expiry_date), 'dd.MM.yyyy HH:mm') : 'Süresiz'}</TableCell>
                                                <TableCell>
                                                    <Badge variant={coupon.is_active ? 'default' : 'outline'} className={coupon.is_active ? 'bg-green-500 text-white' : 'bg-red-100 text-red-700'}>
                                                        {coupon.is_active ? 'Aktif' : 'Pasif'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{`${coupon.current_uses} / ${coupon.max_uses || '∞'}`}</TableCell>
                                                <TableCell className="text-right">
                                                    <Link href={`/admin/coupons/${coupon.id}/edit`} className="mr-2">
                                                        <Button variant="outline" size="sm"><Edit className="h-4 w-4" /></Button>
                                                    </Link>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Bu kuponu kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteCoupon(coupon.id)} className="bg-destructive hover:bg-destructive/90">
                                                                    Sil
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
} 