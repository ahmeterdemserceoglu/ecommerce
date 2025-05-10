"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { addManagedBankAccount } from "@/app/actions/admin-actions";
import { useState } from 'react';

const formSchema = z.object({
    bank_name: z.string().min(2, { message: "Banka adı en az 2 karakter olmalıdır." }),
    account_holder_name: z.string().min(2, { message: "Hesap sahibi adı en az 2 karakter olmalıdır." }),
    iban: z.string().regex(/^TR[0-9]{24}$/, { message: "Geçerli bir TR IBAN giriniz (Örn: TR12...)" }),
    account_number: z.string().optional(),
    branch_code: z.string().optional(),
    swift_bic_code: z.string().optional(),
    currency: z.string().min(3, { message: "Para birimi en az 3 karakter olmalıdır." }),
    instructions: z.string().optional(),
    is_active: z.boolean(),
});

type ManagedBankAccountFormValues = z.infer<typeof formSchema>;

export function AddManagedBankAccountForm() {
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ManagedBankAccountFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            bank_name: "",
            account_holder_name: "",
            iban: "",
            account_number: "",
            branch_code: "",
            swift_bic_code: "",
            currency: "TRY",
            instructions: "",
            is_active: true,
        },
    });

    async function onSubmit(values: ManagedBankAccountFormValues) {
        setIsSubmitting(true);
        const formData = new FormData();
        Object.entries(values).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (typeof value === 'boolean') {
                    formData.append(key, value.toString());
                } else {
                    formData.append(key, value as string);
                }
            }
        });

        const result = await addManagedBankAccount(formData);
        setIsSubmitting(false);

        if (result.success) {
            toast({
                title: "Başarılı!",
                description: result.message,
            });
            router.push("/admin/banka-hesaplari");
            router.refresh();
        } else {
            toast({
                title: "Hata!",
                description: result.message || "Banka hesabı eklenemedi.",
                variant: "destructive",
            });
            if (result.errorDetails) {
                Object.entries(result.errorDetails).forEach(([fieldName, errors]) => {
                    form.setError(fieldName as keyof ManagedBankAccountFormValues, {
                        type: "server",
                        message: (errors as string[]).join(", ")
                    });
                });
            }
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="bank_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Banka Adı *</FormLabel>
                                <FormControl>
                                    <Input placeholder="Örn: Ziraat Bankası" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="account_holder_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Hesap Sahibi Adı *</FormLabel>
                                <FormControl>
                                    <Input placeholder="Tam adınızı girin" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="iban"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>IBAN *</FormLabel>
                            <FormControl>
                                <Input placeholder="TRXXXXXXXXXXXXXXXXXXXXXXXX" {...field} />
                            </FormControl>
                            <FormDescription>
                                TR ile başlayan 26 karakterli IBAN numaranız.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="account_number"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Hesap Numarası (Opsiyonel)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Hesap no" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="branch_code"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Şube Kodu (Opsiyonel)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Şube kodu" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="swift_bic_code"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>SWIFT/BIC Kodu (Opsiyonel)</FormLabel>
                                <FormControl>
                                    <Input placeholder="SWIFT/BIC" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Para Birimi *</FormLabel>
                                <FormControl>
                                    <Input placeholder="TRY" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="instructions"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Talimatlar (Opsiyonel)</FormLabel>
                            <FormDescription>
                                Müşterilerin havale/EFT yaparken görmesi gereken özel talimatlar (örn: Açıklamaya sipariş numaranızı yazınız).
                            </FormDescription>
                            <FormControl>
                                <Textarea placeholder="Ek talimatlar..." className="resize-y" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Hesap Aktif Mi?</FormLabel>
                                <FormDescription>
                                    Bu hesap müşteri ödemeleri için kullanılabilir durumda mı?
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Ekleniyor..." : "Banka Hesabını Ekle"}
                </Button>
            </form>
        </Form>
    );
} 