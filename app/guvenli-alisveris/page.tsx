import React from 'react';
import { ShieldCheck, Lock, CreditCard } from 'lucide-react';

export default function SecureShoppingPage() {
    return (
        <div className="container mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold mb-8 text-center">Güvenli Alışveriş</h1>
            <div className="prose lg:prose-xl max-w-none dark:prose-invert">
                <p className="lead">
                    HDTicaret olarak, alışveriş deneyiminizin her aşamasında güvenliğinizi sağlamak en önemli önceliğimizdir.
                    Kişisel bilgilerinizin ve ödeme detaylarınızın korunması için en güncel teknolojileri ve en iyi uygulamaları kullanıyoruz.
                </p>

                <div className="grid md:grid-cols-3 gap-8 my-10 not-prose">
                    <div className="flex flex-col items-center text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <ShieldCheck className="h-12 w-12 text-green-500 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">SSL Sertifikası</h3>
                        <p className="text-gray-600 dark:text-gray-300">
                            Sitemizdeki tüm veri alışverişi, 256-bit SSL şifreleme teknolojisi ile korunmaktadır. Bu sayede bilgileriniz üçüncü şahısların eline geçmez.
                        </p>
                    </div>
                    <div className="flex flex-col items-center text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Lock className="h-12 w-12 text-blue-500 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Veri Gizliliği</h3>
                        <p className="text-gray-600 dark:text-gray-300">
                            Kişisel verileriniz, Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında güvence altındadır ve asla izniniz olmadan üçüncü taraflarla paylaşılmaz.
                        </p>
                    </div>
                    <div className="flex flex-col items-center text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <CreditCard className="h-12 w-12 text-red-500 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Güvenli Ödeme</h3>
                        <p className="text-gray-600 dark:text-gray-300">
                            Ödeme altyapımız, PCI DSS uyumlu güvenli ödeme sistemleri tarafından sağlanmaktadır. Kredi kartı bilgileriniz asla sistemlerimizde saklanmaz.
                        </p>
                    </div>
                </div>

                <h2 className="text-2xl font-semibold mt-8 mb-4">Güvenli Alışveriş İçin İpuçları</h2>
                <ul>
                    <li>Güçlü ve tahmin edilmesi zor şifreler kullanın. Şifrenizi kimseyle paylaşmayın.</li>
                    <li>Alışverişlerinizi halka açık bilgisayarlar veya güvenli olmayan Wi-Fi ağları üzerinden yapmaktan kaçının.</li>
                    <li>Tarayıcınızın adres çubuğunda "https" ve kilit simgesinin bulunduğundan emin olun.</li>
                    <li>Şüpheli e-postalar veya bağlantılar aracılığıyla kişisel bilgilerinizi paylaşmayın.</li>
                    <li>Hesap hareketlerinizi düzenli olarak kontrol edin.</li>
                </ul>

                <h2 className="text-2xl font-semibold mt-8 mb-4">3D Secure</h2>
                <p>
                    Online ödemelerinizde ek bir güvenlik katmanı olan 3D Secure sistemi kullanılmaktadır. Bu sistem, kartınızla yapılan işlemlerde bankanız tarafından size gönderilen tek kullanımlık bir şifre ile doğrulama yapmanızı gerektirir.
                </p>

                <p className="mt-8">
                    Güvenliğinizle ilgili herhangi bir sorunuz veya endişeniz varsa, lütfen <a href="/iletisim">bizimle iletişime geçmekten</a> çekinmeyin.
                </p>
            </div>
        </div>
    );
} 