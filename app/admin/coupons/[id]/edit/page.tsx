'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Coupon } from '../page'; // Import Coupon type from the list page

export interface CouponEditFormData {
    code: string;
    description?: string | null;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number | string;
    min_purchase_amount?: number | string | null;
    expiry_date?: Date | null;
    max_uses?: number | string | null;
    uses_per_user?: number | string | null;
    is_active: boolean;
    applicable_to: 'all_products' | 'specific_products' | 'specific_categories';
    applicable_product_ids_input?: string;
    applicable_category_ids_input?: string;
    current_uses?: number; // For display, not directly editable in this form
}

export default function EditCouponPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const couponId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<CouponEditFormData | null>(null);
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
    const [categoryLoading, setCategoryLoading] = useState(false);

    const fetchCoupon = useCallback(async () => {
        if (!couponId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('id', couponId)
                .single<Coupon>();

            if (error) throw error;
            if (data) {
                setFormData({
                    ...data,
                    discount_value: data.discount_value.toString(),
                    min_purchase_amount: data.min_purchase_amount?.toString() || '',
                    max_uses: data.max_uses?.toString() || '',
                    uses_per_user: data.uses_per_user?.toString() || '',
                    expiry_date: data.expiry_date ? parseISO(data.expiry_date) : null,
                    applicable_product_ids_input: data.applicable_product_ids?.join(', ') || '',
                    applicable_category_ids_input: data.applicable_category_ids?.join(', ') || '',
                });
            } else {
                toast({ title: "Hata", description: "Kupon bulunamadı.", variant: "destructive" });
                router.push('/admin/coupons');
            }
        } catch (error: any) {
            toast({ title: "Hata", description: "Kupon yüklenirken bir sorun oluştu: " + error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [couponId, router, toast]);

    useEffect(() => {
        fetchCoupon();
    }, [fetchCoupon]);

    useEffect(() => {
        if (formData?.applicable_to === 'specific_categories') {
            setCategoryLoading(true);
            supabase.from('categories').select('id, name').then(({ data, error }) => {
                setCategories(data || []);
                setCategoryLoading(false);
            });
        }
    }, [formData?.applicable_to]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => prev ? { ...prev, [name]: checked } : null);
        } else {
            setFormData(prev => prev ? { ...prev, [name]: value } : null);
        }
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => prev ? { ...prev, [name]: value } as CouponEditFormData : null);
    };

    const handleDateChange = (date: Date | undefined) => {
        setFormData(prev => prev ? { ...prev, expiry_date: date || null } : null);
    };

    const handleCategoryCheckbox = (categoryId: string) => {
        setFormData(prev => {
            if (!prev) return prev;
            const prevIds = prev.applicable_category_ids_input ? prev.applicable_category_ids_input.split(',').map(id => id.trim()).filter(Boolean) : [];
            let newIds;
            if (prevIds.includes(categoryId)) {
                newIds = prevIds.filter(id => id !== categoryId);
            } else {
                newIds = [...prevIds, categoryId];
            }
            return { ...prev, applicable_category_ids_input: newIds.join(',') };
        });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData) return;
        setSaving(true);

        const { applicable_product_ids_input, applicable_category_ids_input, current_uses, ...restOfData } = formData;
        let applicable_product_ids: string[] | null = null;
        let applicable_category_ids: string[] | null = null;

        if (formData.applicable_to === 'specific_products' && applicable_product_ids_input) {
            applicable_product_ids = applicable_product_ids_input.split(',').map(id => id.trim()).filter(id => id);
        }
        if (formData.applicable_to === 'specific_categories' && applicable_category_ids_input) {
            applicable_category_ids = applicable_category_ids_input.split(',').map(id => id.trim()).filter(id => id);
        }

        const couponToUpdate = {
            ...restOfData,
            code: formData.code.toUpperCase(),
            discount_value: parseFloat(formData.discount_value as string),
            min_purchase_amount: formData.min_purchase_amount ? parseFloat(formData.min_purchase_amount as string) : null,
            max_uses: formData.max_uses ? parseInt(formData.max_uses as string, 10) : null,
            uses_per_user: formData.uses_per_user ? parseInt(formData.uses_per_user as string, 10) : 1,
            expiry_date: formData.expiry_date ? formData.expiry_date.toISOString() : null,
            applicable_product_ids,
            applicable_category_ids,
            updated_at: new Date().toISOString(), // Manually set updated_at
        };

        try {
            const { data, error } = await supabase
                .from('coupons')
                .update(couponToUpdate)
                .eq('id', couponId)
                .select()
                .single();

            if (error) throw error;
            toast({ title: "Başarılı", description: `Kupon "${data.code}" başarıyla güncellendi.` });
            router.push('/admin/coupons');
        } catch (error: any) {
            toast({ title: "Hata", description: "Kupon güncellenirken bir sorun oluştu: " + error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="container mx-auto py-8 px-4 md:px-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!formData) {
        return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Kupon bilgileri yüklenemedi.</div>;
    }

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Kuponu Düzenle: {formData.code}</CardTitle>
                    <CardDescription>Kupon detaylarını güncelleyin.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="code">Kupon Kodu</Label>
                                <Input id="code" name="code" value={formData.code} onChange={handleChange} placeholder="ORN: INDIRIM20" required />
                            </div>
                            <div>
                                <Label htmlFor="is_active">Aktif Mi?</Label>
                                <div className="pt-2">
                                    <Checkbox id="is_active" name="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData(prev => prev ? { ...prev, is_active: !!checked } : null)} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
                            <Textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} placeholder="Bu kupon ne için? (örn: Yaz kampanyası)" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="discount_type">İndirim Türü</Label>
                                <Select name="discount_type" value={formData.discount_type} onValueChange={(value) => handleSelectChange('discount_type', value)}>
                                    <SelectTrigger><SelectValue placeholder="İndirim türü seçin" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Yüzdelik (%)</SelectItem>
                                        <SelectItem value="fixed_amount">Sabit Tutar (TL)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="discount_value">İndirim Değeri</Label>
                                <Input id="discount_value" name="discount_value" type="number" value={formData.discount_value} onChange={handleChange} placeholder={formData.discount_type === 'percentage' ? 'Örn: 10' : 'Örn: 50'} required />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="min_purchase_amount">Minimum Sepet Tutarı (Opsiyonel)</Label>
                                <Input id="min_purchase_amount" name="min_purchase_amount" type="number" value={formData.min_purchase_amount || ''} onChange={handleChange} placeholder="Örn: 100" />
                            </div>
                            <div>
                                <Label htmlFor="expiry_date">Bitiş Tarihi (Opsiyonel)</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !formData.expiry_date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.expiry_date ? format(formData.expiry_date, "PPP") : <span>Bir tarih seçin</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={formData.expiry_date || undefined}
                                            onSelect={handleDateChange}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="max_uses">Maksimum Toplam Kullanım (Opsiyonel)</Label>
                                <Input id="max_uses" name="max_uses" type="number" value={formData.max_uses || ''} onChange={handleChange} placeholder="Sınırsız için boş bırakın" />
                            </div>
                            <div>
                                <Label htmlFor="uses_per_user">Kullanıcı Başına Kullanım (Opsiyonel)</Label>
                                <Input id="uses_per_user" name="uses_per_user" type="number" value={formData.uses_per_user || ''} onChange={handleChange} placeholder="Varsayılan: 1" />
                            </div>
                        </div>
                        <div>
                            <Label>Mevcut Kullanım</Label>
                            <p className="text-sm text-muted-foreground">{formData.current_uses} kez kullanıldı.</p>
                        </div>

                        <div>
                            <Label htmlFor="applicable_to">Uygulanacağı Alan</Label>
                            <Select name="applicable_to" value={formData.applicable_to} onValueChange={(value) => handleSelectChange('applicable_to', value)}>
                                <SelectTrigger><SelectValue placeholder="Uygulama alanı seçin" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all_products">Tüm Ürünler</SelectItem>
                                    <SelectItem value="specific_products">Belirli Ürünler</SelectItem>
                                    <SelectItem value="specific_categories">Belirli Kategoriler</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.applicable_to === 'specific_products' && (
                            <div>
                                <Label htmlFor="applicable_product_ids_input">Uygulanacak Ürün ID'leri (Virgülle ayırın)</Label>
                                <Textarea id="applicable_product_ids_input" name="applicable_product_ids_input" value={formData.applicable_product_ids_input || ''} onChange={handleChange} placeholder="örn: uuid1, uuid2, uuid3" />
                            </div>
                        )}

                        {formData.applicable_to === 'specific_categories' && (
                            <div>
                                <Label>Kategoriler</Label>
                                {categoryLoading ? (
                                    <div>Kategoriler yükleniyor...</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto border rounded p-2">
                                        {categories.map(cat => (
                                            <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                    checked={formData.applicable_category_ids_input?.split(',').includes(cat.id) || false}
                                                    onCheckedChange={() => handleCategoryCheckbox(cat.id)}
                                                />
                                                <span>{cat.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <Button type="button" variant="outline" onClick={() => router.push('/admin/coupons')} className="mr-2" disabled={saving}>
                                İptal
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Değişiklikleri Kaydet
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
} 