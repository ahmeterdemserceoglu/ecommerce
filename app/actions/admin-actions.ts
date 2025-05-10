"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Database } from "@/types/supabase";

// Zod şeması ile form verilerini doğrulama
const ManagedBankAccountSchema = z.object({
    bank_name: z.string().min(2, { message: "Banka adı en az 2 karakter olmalıdır." }),
    account_holder_name: z.string().min(2, { message: "Hesap sahibi adı en az 2 karakter olmalıdır." }),
    iban: z.string().regex(/^TR[0-9]{24}$/, { message: "Geçerli bir TR IBAN giriniz (Örn: TR123456789012345678901234)." }),
    account_number: z.string().optional(),
    branch_code: z.string().optional(),
    swift_bic_code: z.string().optional(),
    currency: z.string().min(3, { message: "Para birimi en az 3 karakter olmalıdır (örn: TRY)." }).default("TRY"),
    instructions: z.string().optional(),
    is_active: z.boolean().default(true),
});

interface ActionResult {
    success: boolean;
    message: string;
    errorDetails?: any; // Zod hataları veya diğer detaylar için
}

export async function addManagedBankAccount(formData: FormData): Promise<ActionResult> {
    const supabase = createServerActionClient<Database>({ cookies });

    // Admin yetki kontrolü (önemli!)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "Yetkisiz erişim. Lütfen giriş yapın." };
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") {
        return { success: false, message: "Bu işlemi yapmak için admin yetkiniz bulunmuyor." };
    }

    const rawFormData = {
        bank_name: formData.get("bank_name"),
        account_holder_name: formData.get("account_holder_name"),
        iban: formData.get("iban"),
        account_number: formData.get("account_number") || undefined,
        branch_code: formData.get("branch_code") || undefined,
        swift_bic_code: formData.get("swift_bic_code") || undefined,
        currency: formData.get("currency") || "TRY",
        instructions: formData.get("instructions") || undefined,
        is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true" || true, // Checkbox'tan gelen değere göre
    };

    const validationResult = ManagedBankAccountSchema.safeParse(rawFormData);

    if (!validationResult.success) {
        console.error("Validation errors:", validationResult.error.flatten().fieldErrors);
        return {
            success: false,
            message: "Form verileri geçersiz. Lütfen hataları düzeltin.",
            errorDetails: validationResult.error.flatten().fieldErrors,
        };
    }

    const { data: newAccount, error: insertError } = await supabase
        .from("managed_bank_accounts")
        .insert(validationResult.data) // Doğrulanmış veriyi kullan
        .select()
        .single();

    if (insertError) {
        console.error("Error inserting managed bank account:", insertError);
        // IBAN unique kısıtlaması hatası olabilir
        if (insertError.code === "23505") { // Unique violation
            return { success: false, message: "Bu IBAN numarası zaten kayıtlı. Lütfen farklı bir IBAN girin." };
        }
        return { success: false, message: `Banka hesabı eklenirken bir hata oluştu: ${insertError.message}` };
    }

    revalidatePath("/admin/banka-hesaplari"); // Admin listeleme sayfasını yenile

    return {
        success: true,
        message: `Banka hesabı '${newAccount?.bank_name} - ${newAccount?.iban}' başarıyla eklendi.`,
    };
}

export async function updateManagedBankAccount(id: string, formData: FormData): Promise<ActionResult> {
    const supabase = createServerActionClient<Database>({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "Yetkisiz erişim. Lütfen giriş yapın." };
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") {
        return { success: false, message: "Bu işlemi yapmak için admin yetkiniz bulunmuyor." };
    }

    const rawFormData = {
        bank_name: formData.get("bank_name"),
        account_holder_name: formData.get("account_holder_name"),
        iban: formData.get("iban"),
        account_number: formData.get("account_number") || undefined,
        branch_code: formData.get("branch_code") || undefined,
        swift_bic_code: formData.get("swift_bic_code") || undefined,
        currency: formData.get("currency") || "TRY",
        instructions: formData.get("instructions") || undefined,
        is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true" || true,
    };

    const validationResult = ManagedBankAccountSchema.safeParse(rawFormData);
    if (!validationResult.success) {
        return {
            success: false,
            message: "Form verileri geçersiz. Lütfen hataları düzeltin.",
            errorDetails: validationResult.error.flatten().fieldErrors,
        };
    }

    const { error: updateError } = await supabase
        .from("managed_bank_accounts")
        .update(validationResult.data)
        .eq("id", id);

    if (updateError) {
        return { success: false, message: `Banka hesabı güncellenirken bir hata oluştu: ${updateError.message}` };
    }

    revalidatePath("/admin/banka-hesaplari");
    return { success: true, message: "Banka hesabı başarıyla güncellendi." };
}

export async function deleteManagedBankAccount(id: string): Promise<ActionResult> {
    const supabase = createServerActionClient<Database>({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "Yetkisiz erişim. Lütfen giriş yapın." };
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") {
        return { success: false, message: "Bu işlemi yapmak için admin yetkiniz bulunmuyor." };
    }

    const { error: deleteError } = await supabase
        .from("managed_bank_accounts")
        .delete()
        .eq("id", id);

    if (deleteError) {
        return { success: false, message: `Banka hesabı silinirken bir hata oluştu: ${deleteError.message}` };
    }

    revalidatePath("/admin/banka-hesaplari");
    return { success: true, message: "Banka hesabı başarıyla silindi." };
} 