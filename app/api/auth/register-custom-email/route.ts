import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import * as z from "zod";

// Zod schema for registration data
const registerSchema = z.object({
    email: z.string().email("Geçersiz e-posta."),
    password: z.string().min(6, "Şifre en az 6 karakter olmalı."),
    fullName: z.string().min(1, "Ad Soyad gerekli."),
});

// Supabase Admin Client (SERVICE_ROLE_KEY gerekli!)
const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // SERVICE_ROLE_KEY burada zorunlu

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase URL or Service Role Key is missing.");
        return null;
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
};

export async function POST(request: NextRequest) {
    const supabaseAdmin = createAdminClient();
    if (!supabaseAdmin) {
        return NextResponse.json({ error: "Sunucu yapılandırma hatası." }, { status: 500 });
    }

    let userData: z.infer<typeof registerSchema>;
    try {
        const body = await request.json();
        const validation = registerSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: "Geçersiz kayıt bilgileri.", details: validation.error.format() }, { status: 400 });
        }
        userData = validation.data;
    } catch (e) {
        return NextResponse.json({ error: "İstek işlenemedi." }, { status: 400 });
    }

    const { email, password, fullName } = userData;

    try {
        // 1. Kullanıcıyı Auth'da oluştur (Admin Client ile)
        // email_confirm: true -> Kullanıcı başlangıçta doğrulanmamış olur.
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // Kullanıcı e-posta onayı bekleyecek
            user_metadata: { full_name: fullName }, // İsim gibi bilgileri buraya ekleyebiliriz
        });

        if (authError) {
            console.error("Supabase auth.admin.createUser error:", authError);
            // Hata mesajını daha kullanıcı dostu hale getirelim
            let userMessage = `Kullanıcı oluşturulamadı: ${authError.message}`;
            if (authError.message.includes("User already exists")) {
                userMessage = "Bu e-posta adresi ile zaten bir kullanıcı kayıtlı.";
            } else if (authError.message.includes("Password should be")) {
                userMessage = "Şifre yeterince güçlü değil veya minimum gereksinimleri karşılamıyor.";
            }
            return NextResponse.json({ error: userMessage }, { status: 400 }); // 400 Bad Request daha uygun olabilir
        }

        const userId = authData.user.id;
        console.log(`Auth user created successfully: ${userId}`);

        // 2. Profil tablosuna ekle (Admin Client ile)
        // Not: Rol senkronizasyon trigger'ı bunun ardından çalışmalı.
        const initialRole = 'user'; // Yeni kayıtlar için varsayılan rol
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .insert({
                id: userId,
                email: email,
                full_name: fullName,
                role: initialRole,
                updated_at: new Date().toISOString(),
            });

        if (profileError) {
            // Profil ekleme hatası ciddi bir sorun, auth kullanıcısını silmeyi deneyebiliriz
            console.error(`Failed to insert profile for ${userId}:`, profileError);
            try {
                await supabaseAdmin.auth.admin.deleteUser(userId);
                console.log(`Cleaned up auth user ${userId} after profile insert failure.`);
            } catch (deleteError) {
                console.error(`Failed to clean up auth user ${userId}:`, deleteError);
            }
            let userMessage = `Profil oluşturulamadı: ${profileError.message}`;
            if (profileError.code === '23505') { // Unique constraint
                userMessage = "Profil oluşturulamadı: E-posta veya ID zaten mevcut.";
            }
            return NextResponse.json({ error: userMessage }, { status: 500 });
        }
        console.log(`Profile created successfully for user ${userId}`);


        // 3. Doğrulama Linki Üret (Admin Client ile)
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: "signup", // Onaylama tipi 'signup'
            email: email,
            redirect_to: process.env.NEXT_PUBLIC_SITE_URL + "/auth/callback" // Onay sonrası yönlendirilecek sayfa
        });

        if (linkError || !linkData?.properties?.confirmation_url) {
            console.error("Failed to generate confirmation link:", linkError);
            // Kullanıcı oluşturuldu ama link üretilemedi. Bu durum elle çözülmeli.
            let detailedError = "Doğrulama linki üretilemedi.";
            if (linkError) {
                detailedError += ` Detay: ${linkError.message || JSON.stringify(linkError)}`;
                console.error("generateLink Error Details:", JSON.stringify(linkError, null, 2));
            } else if (!linkData?.properties?.confirmation_url) {
                detailedError += " Supabase'den geçerli bir onay URL'si alınamadı.";
                console.error("generateLink Response Missing URL:", JSON.stringify(linkData, null, 2));
            }
            return NextResponse.json({ error: detailedError }, { status: 500 });
        }

        const confirmationUrl = linkData.properties.confirmation_url;
        console.log(`Generated confirmation URL for ${email}`);

        // 4. E-posta Gönder (Nodemailer ile)
        try {
            // SMTP ayarlarını ortam değişkenlerinden al
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST, // Örn: smtpout.secureserver.net
                port: parseInt(process.env.SMTP_PORT || "465"), // Örn: 465
                secure: (process.env.SMTP_PORT || "465") === "465", // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER, // Örn: admin@hdticaret.com
                    pass: process.env.SMTP_PASS, // Örn: .env'deki şifre
                },
            });

            // HTML şablonunu oku (Proje kök dizininde 'emails/confirm-signup-template.html' olduğu varsayıldı)
            const templatePath = path.resolve(process.cwd(), "emails", "confirm-signup-template.html");
            if (!fs.existsSync(templatePath)) {
                console.error(`Email template not found at: ${templatePath}`);
                throw new Error("Email template file not found.");
            }
            let htmlContent = fs.readFileSync(templatePath, "utf8");

            // Değişkenleri HTML içinde değiştir
            htmlContent = htmlContent.replace(/{{[ .]*Email[ .]*}}/g, email);
            htmlContent = htmlContent.replace(/{{[ .]*ConfirmationURL[ .]*}}/g, confirmationUrl);
            // SiteURL gibi diğer değişkenleri de ekleyebilirsiniz
            htmlContent = htmlContent.replace(/{{[ .]*SiteURL[ .]*}}/g, process.env.NEXT_PUBLIC_SITE_URL || "https://www.hdticaret.com/");
            // Yıl değişkeni için özel mantık
            htmlContent = htmlContent.replace(/{{[ .]*now.Year[ .]*}}/g, new Date().getFullYear().toString());

            // E-posta gönder
            await transporter.sendMail({
                from: `"${process.env.SMTP_SENDER_NAME || 'Hd Ticaret'}" <${process.env.SMTP_SENDER_EMAIL || process.env.SMTP_USER}>`, // Gönderen Adı <e-posta>
                to: email, // Alıcı
                subject: "HD Ticaret Hesabınızı Onaylayın", // Konu
                html: htmlContent, // HTML içeriği
            });

            console.log(`Confirmation email sent successfully to ${email}`);

        } catch (emailError) {
            console.error("Failed to send confirmation email:", emailError);
            // Kullanıcı oluşturuldu ama e-posta gönderilemedi. Kullanıcıya bilgi verilebilir.
            // Bu durumda kayıt başarılı ama doğrulama linki gitmedi. Manuel aksiyon gerekebilir.
            // Şimdilik genel başarı döndürebiliriz ama loglama önemli.
            return NextResponse.json({ message: "Hesap oluşturuldu ancak doğrulama e-postası gönderirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin veya destek ile iletişime geçin." }, { status: 207 }); // Multi-Status gibi bir kod? Veya 500?
        }

        // Her şey başarılı
        return NextResponse.json({ message: "Kayıt başarılı. Lütfen e-postanızı kontrol edin." }, { status: 201 });

    } catch (error: any) {
        console.error("Unhandled error in /api/auth/register-custom-email:", error);
        return NextResponse.json({ error: "Beklenmedik bir sunucu hatası oluştu." }, { status: 500 });
    }
} 
